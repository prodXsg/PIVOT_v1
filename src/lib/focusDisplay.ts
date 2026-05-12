/** Base session type from a display label (e.g. "Full Body — extra attention…" → "Full Body"). */
export function baseStructureFromFocusLabel(focus: string): string {
  const s = focus.trim();
  const delims = [" — ", " · ", " • "];
  let cut = -1;
  for (const d of delims) {
    const i = s.indexOf(d);
    if (i >= 0 && (cut < 0 || i < cut)) cut = i;
  }
  return cut >= 0 ? s.slice(0, cut).trim() : s;
}

/** Whether an exercise's primary muscle is plausibly called out in the intent phrase (lowercase). */
export function exercisePrimaryMatchesIntentPhrase(tailLower: string, primaryMuscle: string | undefined): boolean {
  if (!primaryMuscle || !tailLower) return false;
  if (primaryMuscle === "core") return tailLower.includes("core") || tailLower.includes("abs");
  if (primaryMuscle === "shoulders") return tailLower.includes("shoulder") || tailLower.includes("delt");
  return tailLower.includes(primaryMuscle);
}

/** Lowercase phrase used to match primary muscles to the user's emphasis (handles new + legacy hint text). */
export function intentPhraseForExerciseSignal(hint: string | null): string {
  if (!hint) return "";
  const h = hint.toLowerCase();
  const prefix = "extra attention to ";
  return h.startsWith(prefix) ? h.slice(prefix.length) : h;
}

/** Split stored focus label into main session type + optional human hint (legacy ` · ` supported). */
export function parseWorkoutFocusHeader(focus: string): { main: string; hint: string | null } {
  const s = focus.trim();
  const em = s.match(/^(.+?)\s+—\s+(.+)$/);
  if (em) return { main: em[1].trim(), hint: em[2].trim() };
  if (s.includes(" · ")) {
    const parts = s.split(/\s*·\s*/);
    if (parts.length >= 2) return { main: parts[0].trim(), hint: parts.slice(1).join(" · ") };
  }
  return { main: s, hint: null };
}
