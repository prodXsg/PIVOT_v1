import { callGemini, corsHeaders, json, sanitizeInput } from "../_shared/gemini.ts";
import { EXERCISES, canonicalName, inferFocus, scoreExercise, shouldDebugAdaptive, isFocusLegal, isDuplicateLegal } from "../_shared/adaptive.ts";

function chooseDeterministicReplacement(args: {
  focus: ReturnType<typeof inferFocus>;
  originalName: string;
  constraint: string;
  used: Set<string>;
  note: string;
  equipmentContext: string;
  recentExercises: string[];
  currentWorkout?: Array<{ name: string }>;
  priorPivots?: Array<{ replacement?: string }>;
}) {
  const c = `${args.constraint} ${args.note}`.toLowerCase();
  const pool = EXERCISES;
  const orig = canonicalName(args.originalName);
  const origEx = pool.find((e) => canonicalName(e.name) === orig);

  const pain = c.includes("pain") || c.includes("hurt") || c.includes("injur") || c.includes("tweak") || c.includes("shoulder") || c.includes("elbow") || c.includes("knee") || c.includes("back");
  const time = c.includes("time") || c.includes("late") || c.includes("minutes") || c.includes("only") || c.includes("rush");
  const equipmentBusy = c.includes("busy") || c.includes("taken") || c.includes("no") || c.includes("unavailable") || c.includes("broken");

  const candidates = pool
    .filter((e) => canonicalName(e.name) !== orig && !args.used.has(canonicalName(e.name)))
    .filter((e) => {
      // HARD INVARIANT: Focus legality
      if (!isFocusLegal(e, args.focus)) {
        return false;
      }
      return true;
    });

  const scored = candidates
    .map((e) => {
      let score = scoreExercise({
        ex: e,
        focus: args.focus,
        sleep: 7,
        energy: 6,
        soreness: pain ? 8 : 3,
        note: c,
        recent: args.recentExercises,
        usedPatterns: new Set(),
        equipmentContext: args.equipmentContext,
      });
      if (origEx && e.primaryMuscle === origEx.primaryMuscle) score += 7;
      if (origEx && e.movementPattern === origEx.movementPattern) score += 8;
      if (origEx && e.kind === origEx.kind) score += 2;
      if (pain) {
        if (e.jointStress === "low") score += 8;
        if (e.jointStress === "high") score -= 9;
        if (e.name.includes("Machine")) score += 3;
        if (e.name.includes("Cable")) score += 1;
      }
      if (equipmentBusy) {
        if (e.name.includes("Dumbbell")) score += 2;
        if (e.name.includes("Machine")) score += 1;
      }
      if (time) {
        if (e.name.toLowerCase().includes("drop")) score += 4;
        if (e.kind === "compound") score += 2;
      }
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));

  const picked = scored[0]?.e;
  if (!picked) return null;

  const sets = pain || time ? 2 : 3;
  const reps = time ? "AMRAP" : "10-12";
  return {
    name: picked.name,
    setsReps: `${sets} sets - ${reps} reps`,
    cue: pain ? "Keep the range pain-free." : undefined,
    rationale: sanitizeInput(
      time
        ? "Swapped to a high-value movement with fewer sets to fit the time constraint."
        : pain
        ? "Swapped to a more stable option while keeping the same training intent."
        : "Swapped to match the constraint while preserving the session focus.",
      220,
    ),
    constraint: args.constraint,
  };
}

const SYSTEM_PROMPT = `You are Pivot. The user is mid-workout and needs an exercise swap.

Original exercise:
- Name: {EXERCISE_NAME}
- Sets: {SETS}
- Reps: {REPS}

Workout focus: {WORKOUT_FOCUS}
User constraint: "{USER_CONSTRAINT}"

Prior pivots this session:
{PRIOR_PIVOTS}

Rules:
1. Replace the original exercise with one alternative only.
2. Do not suggest an exercise already used in prior pivots.
3. Equipment constraint: same muscle group and similar movement pattern.
4. Pain/injury constraint: avoid the affected joint or muscle.
5. Time constraint: reduce sets and choose the highest-value movement.
6. Keep the replacement aligned with the workout focus when possible.
7. You MUST ONLY choose a replacement from the allowed exercise list. Do not invent exercises.

Output only valid JSON:
{
  "replacement": {
    "name": "New exercise name",
    "sets": 3,
    "reps": "10-12",
    "muscle_group": "target muscle",
    "is_compound": true,
    "form_cue": "Optional cue"
  },
  "rationale": "One sentence explaining the swap."
}`;

function parseSetsReps(s: string): { sets: number; reps: string } {
  const setsReps = /(\d+)\s*sets?\s*[-·]\s*(.+?)\s*reps?/i.exec(s || "");
  if (setsReps) return { sets: Number.parseInt(setsReps[1], 10), reps: setsReps[2].trim() };
  const cross = /(\d+)\s*[×x]\s*(.+)/i.exec(s || "");
  return { sets: cross ? Number.parseInt(cross[1], 10) : 3, reps: cross ? cross[2].trim() : "8-10" };
}

function fallbackReplacement(constraint: string) {
  const c = constraint.toLowerCase();
  if (c.includes("shoulder") || c.includes("pain") || c.includes("hurt")) {
    return {
      name: "Machine Chest Press",
      setsReps: "3 sets - 10-12 reps",
      cue: "Keep the range pain-free.",
      rationale: "Keeps pressing work more stable while avoiding the painful range.",
      constraint,
    };
  }
  if (c.includes("time") || c.includes("late") || c.includes("minutes")) {
    return {
      name: "Push-up Drop Set",
      setsReps: "2 sets - AMRAP reps",
      cue: "Stop before form breaks.",
      rationale: "Compresses the push stimulus into a shorter block.",
      constraint,
    };
  }
  return {
    name: "Dumbbell Floor Press",
    setsReps: "3 sets - 10-12 reps",
    cue: "Pause briefly at the bottom.",
    rationale: "Maintains a similar pressing pattern without needing the same equipment.",
    constraint,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { exercise, constraint, workoutFocus, priorPivots, currentExercises, recentExercises, equipment, note } = await req.json();
    const safeConstraint = sanitizeInput(typeof constraint === "string" ? constraint : "", 300);
    const sr = parseSetsReps(String(exercise?.setsReps ?? ""));

    const used = new Set<string>();
    // Used = current workout exercises + prior pivot replacements + original exercise
    if (Array.isArray(currentExercises)) {
      for (const n of currentExercises) used.add(canonicalName(String(n)));
    }
    if (Array.isArray(priorPivots)) {
      for (const p of priorPivots) used.add(canonicalName(String(p?.replacement ?? "")));
    }
    used.add(canonicalName(String(exercise?.name ?? "")));

    const focus = inferFocus(String(workoutFocus ?? "Full Body"));
    const pivotScoring = EXERCISES
      .map((e) => {
        const evald = scoreExercise({
        ex: e,
        focus,
        sleep: 7,
        energy: 6,
        soreness: safeConstraint.toLowerCase().includes("pain") ? 8 : 3,
        note: `${safeConstraint} ${sanitizeInput(String(note ?? ""), 120)}`,
        recent: Array.isArray(recentExercises) ? recentExercises.map((x: unknown) => String(x)) : [],
        usedPatterns: new Set(),
        equipmentContext: sanitizeInput(String(equipment ?? "Full Gym"), 60),
      });
      return { name: e.name, score: evald.score, reasons: evald.reasons };
    });
    const allowed = EXERCISES
      .filter((e) => {
        const entry = pivotScoring.find((s) => canonicalName(s.name) === canonicalName(e.name));
        // Soft scoring filter: only consider exercises with reasonable scores
        if ((entry?.score ?? -999) <= -10) {
          return false;
        }
        // HARD INVARIANT: Focus legality — only allow focus-legal exercises
        if (!isFocusLegal(e, focus)) {
          return false;
        }
        // HARD INVARIANT: Duplicate check — reject if already used
        if (used.has(canonicalName(e.name))) {
          return false;
        }
        return true;
      });
    const allowedText = allowed.map((e) => `- ${e.name}`).join("\n");

    const priorPivotsText = Array.isArray(priorPivots) && priorPivots.length
      ? priorPivots
          .slice(0, 5)
          .map((p: { original?: unknown; replacement?: unknown; constraint?: unknown }) =>
            `- ${sanitizeInput(String(p.replacement ?? ""), 80)} from ${sanitizeInput(String(p.original ?? ""), 80)} (${sanitizeInput(String(p.constraint ?? ""), 120)})`
          )
          .join("\n")
      : "None";

    const prompt = SYSTEM_PROMPT
      .replace("{EXERCISE_NAME}", sanitizeInput(String(exercise?.name ?? "Unknown"), 100))
      .replace("{SETS}", String(sr.sets))
      .replace("{REPS}", sanitizeInput(sr.reps, 30))
      .replace("{WORKOUT_FOCUS}", sanitizeInput(String(workoutFocus ?? "Today's session"), 100))
      .replace("{USER_CONSTRAINT}", safeConstraint)
      .replace("{PRIOR_PIVOTS}", priorPivotsText) + `\n\nAllowed replacement exercises:\n${allowedText}\n`;

    const raw = (await callGemini(prompt)) as {
      replacement?: { name?: string; sets?: number; reps?: string; form_cue?: string };
      rationale?: string;
    };
    const r = raw.replacement;
    const proposed = r?.name ? canonicalName(r.name) : "";
    const allowedByCanon = new Map(allowed.map((e) => [canonicalName(e.name), e.name]));
    const allowedName = proposed ? allowedByCanon.get(proposed) : undefined;

    // Hard filtering: reject duplicates / disallowed replacements.
    if (!allowedName || used.has(canonicalName(allowedName))) {
      const det = chooseDeterministicReplacement({
        focus,
        originalName: String(exercise?.name ?? ""),
        constraint: safeConstraint,
        used,
        note: sanitizeInput(String(note ?? ""), 120),
        equipmentContext: sanitizeInput(String(equipment ?? "Full Gym"), 60),
        recentExercises: Array.isArray(recentExercises) ? recentExercises.map((x: unknown) => String(x)) : [],
        currentWorkout: Array.isArray(currentExercises) ? currentExercises.map((x: unknown) => ({ name: String(x) })) : undefined,
        priorPivots: Array.isArray(priorPivots) ? priorPivots : undefined,
      });
      if (det) return json(det);
      return json(fallbackReplacement(safeConstraint));
    }

    return json({
      name: sanitizeInput(allowedName, 100),
      setsReps: `${r?.sets ?? 3} sets - ${sanitizeInput(r?.reps ?? "10-12", 30)} reps`,
      cue: r?.form_cue ? sanitizeInput(r.form_cue, 160) : undefined,
      rationale: sanitizeInput(raw.rationale ?? "Swapped to fit the current constraint.", 220),
      constraint: safeConstraint,
      reasoning: {
        summary: "Preserved session intent while adapting to your constraint.",
        selection: [
          "Prioritized replacements with matching movement pattern and muscle stimulus.",
        ],
        constraints: [
          "Blocked already-used replacements and duplicates in the current workout.",
        ],
        adaptations: [
          safeConstraint.toLowerCase().includes("pain")
            ? "Reduced joint stress due to pain/soreness constraint."
            : "Adjusted replacement around equipment/time constraints.",
        ],
      },
      debug: shouldDebugAdaptive()
        ? {
            pivotScoring,
            used: [...used],
          }
        : undefined,
    });
  } catch {
    return json(fallbackReplacement(""));
  }
});
