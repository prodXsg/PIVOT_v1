export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type MovementPattern =
  | "horizontal-press"
  | "vertical-press"
  | "horizontal-pull"
  | "vertical-pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "carry"
  | "core-stability"
  | "elbow-flexion"
  | "elbow-extension"
  | "abduction"
  | "adduction";

export type EquipmentType = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "bench";
export type JointStress = "low" | "moderate" | "high";
export type Level = "beginner" | "intermediate" | "advanced";

export type ExerciseMeta = {
  name: string;
  primaryMuscle: Muscle;
  secondaryMuscles: Muscle[];
  movementPattern: MovementPattern;
  equipment: EquipmentType[];
  unilateral: boolean;
  jointStress: JointStress;
  level: Level;
  estimatedTimeSec: number;
  fatigueCost: number; // 1-10
  pivotTags: string[];
  kind: "compound" | "accessory";
};

export type AdaptiveMemory = {
  favoritePatterns?: Record<string, number>;
  skippedPatterns?: Record<string, number>;
  failedCompletionPatterns?: Record<string, number>;
  recurringPivotReasons?: Record<string, number>;
  recurringPainConstraints?: Record<string, number>;
};

export type ScoringBreakdown = {
  exercise: string;
  score: number;
  reasons: string[];
};

export function shouldDebugAdaptive(): boolean {
  return (Deno.env.get("PIVOT_DEBUG_ADAPTIVE") ?? "").toLowerCase() === "true";
}

export type Focus =
  | "Push"
  | "Pull"
  | "Legs"
  | "Full Body"
  | "Core"
  | "Conditioning"
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Glutes"
  | "Hamstrings"
  | "Quads"
  | "Calves"
  | "Arms"
  | "Rear Delts";

export const FOCUS_LIST: Focus[] = [
  "Push", "Pull", "Legs", "Full Body", "Core", "Conditioning", "Chest", "Back", "Shoulders",
  "Biceps", "Triceps", "Glutes", "Hamstrings", "Quads", "Calves", "Arms", "Rear Delts",
];

/** Optional user emphasis (multi) layered on Push/Pull/Legs/Full Body — additive scoring hints only. */
export type ParsedEmphasis = {
  muscles: Muscle[];
  rearDeltBoost: boolean;
  forearmsBoost: boolean;
};

/** Per-iteration: user emphasis not yet represented by a direct primary (or tag / pattern for special cases). */
export type EmphasisScoringTargets = {
  uncoveredMuscles: Set<Muscle>;
  needRearDeltTag: boolean;
  needForearmFlex: boolean;
};

function buildEmphasisTargets(emphasis: ParsedEmphasis | null | undefined, picked: ExerciseMeta[]): EmphasisScoringTargets | null {
  if (!emphasis) return null;
  const uncoveredMuscles = new Set<Muscle>();
  for (const m of emphasis.muscles) {
    if (!picked.some((p) => p.primaryMuscle === m)) uncoveredMuscles.add(m);
  }
  const needRearDeltTag = !!(emphasis.rearDeltBoost && !picked.some((p) => p.pivotTags.includes("rear-delt")));
  const needForearmFlex = !!(emphasis.forearmsBoost && !picked.some((p) => p.movementPattern === "elbow-flexion"));
  if (!uncoveredMuscles.size && !needRearDeltTag && !needForearmFlex) return null;
  return { uncoveredMuscles, needRearDeltTag, needForearmFlex };
}

function orderPickedForEmphasis(picked: ExerciseMeta[], emphasis: ParsedEmphasis | null | undefined): ExerciseMeta[] {
  if (!emphasis || (!emphasis.muscles.length && !emphasis.rearDeltBoost && !emphasis.forearmsBoost)) return picked;
  const muscleSet = new Set(emphasis.muscles);
  const isDirect = (ex: ExerciseMeta): boolean => {
    if (muscleSet.has(ex.primaryMuscle)) return true;
    if (emphasis.rearDeltBoost && ex.pivotTags.includes("rear-delt")) return true;
    if (emphasis.forearmsBoost && ex.movementPattern === "elbow-flexion") return true;
    return false;
  };
  const direct = picked.filter(isDirect);
  const rest = picked.filter((e) => !isDirect(e));
  return [...direct, ...rest];
}

/** Maps client `focusEmphasis` ids to deterministic scoring hints. Unknown ids are ignored. */
export function parseFocusEmphasis(raw: unknown): ParsedEmphasis {
  const ids = Array.isArray(raw)
    ? raw.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
    : [];
  const muscles: Muscle[] = [];
  const add = (m: Muscle) => {
    if (!muscles.includes(m)) muscles.push(m);
  };
  let rearDeltBoost = false;
  let forearmsBoost = false;
  for (const id of ids) {
    if (id === "chest") add("chest");
    else if (id === "back") add("back");
    else if (id === "shoulders") add("shoulders");
    else if (id === "rear-delts" || id === "rear delts") rearDeltBoost = true;
    else if (id === "biceps") add("biceps");
    else if (id === "triceps") add("triceps");
    else if (id === "glutes") add("glutes");
    else if (id === "hamstrings") add("hamstrings");
    else if (id === "calves") add("calves");
    else if (id === "abs-core" || id === "core") add("core");
    else if (id === "forearms") forearmsBoost = true;
  }
  return { muscles, rearDeltBoost, forearmsBoost };
}

export const EXERCISES: ExerciseMeta[] = [
  { name: "Dumbbell Bench Press", primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], movementPattern: "horizontal-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 420, fatigueCost: 7, pivotTags: ["no-barbell", "bench-required"], kind: "compound" },
  { name: "Machine Chest Press", primaryMuscle: "chest", secondaryMuscles: ["triceps"], movementPattern: "horizontal-press", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["joint-friendly"], kind: "compound" },
  { name: "Incline Dumbbell Press", primaryMuscle: "chest", secondaryMuscles: ["shoulders", "triceps"], movementPattern: "horizontal-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["bench-required"], kind: "compound" },
  { name: "Push-up Drop Set", primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], movementPattern: "horizontal-press", equipment: ["bodyweight"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 180, fatigueCost: 5, pivotTags: ["time-crunch", "no-equipment"], kind: "accessory" },
  { name: "Seated Dumbbell Shoulder Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], movementPattern: "vertical-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "high", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["overhead"], kind: "compound" },
  { name: "Machine Shoulder Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], movementPattern: "vertical-press", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["joint-friendly", "overhead"], kind: "compound" },
  { name: "Cable Lateral Raise", primaryMuscle: "shoulders", secondaryMuscles: [], movementPattern: "abduction", equipment: ["cable"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["shoulder-friendly"], kind: "accessory" },
  { name: "Dumbbell Lateral Raise", primaryMuscle: "shoulders", secondaryMuscles: [], movementPattern: "abduction", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["no-cable"], kind: "accessory" },
  { name: "Triceps Rope Pushdown", primaryMuscle: "triceps", secondaryMuscles: [], movementPattern: "elbow-extension", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Overhead Cable Triceps Extension", primaryMuscle: "triceps", secondaryMuscles: [], movementPattern: "elbow-extension", equipment: ["cable"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["overhead"], kind: "accessory" },
  { name: "Pec Deck Fly", primaryMuscle: "chest", secondaryMuscles: ["shoulders"], movementPattern: "adduction", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Lat Pulldown", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "vertical-pull", equipment: ["cable", "machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["no-pullup"], kind: "compound" },
  { name: "Assisted Pull-Up", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "vertical-pull", equipment: ["machine"], unilateral: false, jointStress: "high", level: "intermediate", estimatedTimeSec: 360, fatigueCost: 7, pivotTags: ["pullup"], kind: "compound" },
  { name: "Seated Cable Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "horizontal-pull", equipment: ["cable"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["stable"], kind: "compound" },
  { name: "Chest-Supported Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "horizontal-pull", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 390, fatigueCost: 6, pivotTags: ["lower-back-friendly"], kind: "compound" },
  { name: "One-Arm Dumbbell Row", primaryMuscle: "back", secondaryMuscles: ["biceps", "core"], movementPattern: "horizontal-pull", equipment: ["dumbbell", "bench"], unilateral: true, jointStress: "moderate", level: "beginner", estimatedTimeSec: 420, fatigueCost: 6, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Face Pull", primaryMuscle: "shoulders", secondaryMuscles: ["back"], movementPattern: "horizontal-pull", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["rear-delt"], kind: "accessory" },
  { name: "Reverse Pec Deck", primaryMuscle: "shoulders", secondaryMuscles: ["back"], movementPattern: "horizontal-pull", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["rear-delt"], kind: "accessory" },
  { name: "Dumbbell Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms"], kind: "accessory" },
  { name: "Cable Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms"], kind: "accessory" },
  { name: "Hammer Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms"], kind: "accessory" },
  { name: "Goblet Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes", "core"], movementPattern: "squat", equipment: ["dumbbell"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["no-rack"], kind: "compound" },
  { name: "Leg Press", primaryMuscle: "quads", secondaryMuscles: ["glutes"], movementPattern: "squat", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["knee-load"], kind: "compound" },
  { name: "Romanian Deadlift", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "back"], movementPattern: "hinge", equipment: ["dumbbell", "barbell"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 420, fatigueCost: 8, pivotTags: ["posterior-chain"], kind: "compound" },
  { name: "Seated Leg Curl", primaryMuscle: "hamstrings", secondaryMuscles: [], movementPattern: "hinge", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Leg Extension", primaryMuscle: "quads", secondaryMuscles: [], movementPattern: "squat", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Walking Lunges", primaryMuscle: "glutes", secondaryMuscles: ["quads", "hamstrings"], movementPattern: "lunge", equipment: ["dumbbell", "bodyweight"], unilateral: true, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Split Squat", primaryMuscle: "glutes", secondaryMuscles: ["quads"], movementPattern: "lunge", equipment: ["dumbbell", "bodyweight"], unilateral: true, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Hip Thrust (Machine)", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], movementPattern: "hinge", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 330, fatigueCost: 6, pivotTags: ["glute-focused"], kind: "compound" },
  { name: "Standing Calf Raise", primaryMuscle: "calves", secondaryMuscles: [], movementPattern: "carry", equipment: ["machine", "bodyweight"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 180, fatigueCost: 2, pivotTags: ["calves"], kind: "accessory" },
  { name: "Seated Calf Raise", primaryMuscle: "calves", secondaryMuscles: [], movementPattern: "carry", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 180, fatigueCost: 2, pivotTags: ["calves"], kind: "accessory" },
  { name: "Plank", primaryMuscle: "core", secondaryMuscles: [], movementPattern: "core-stability", equipment: ["bodyweight"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 150, fatigueCost: 2, pivotTags: ["core"], kind: "accessory" },
];

export function canonicalName(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s()+/-]/g, "");
}

type FocusRule = {
  primary: Muscle[];
  secondary: Muscle[];
  priorityPatterns: MovementPattern[];
};

const FOCUS_RULES: Record<Focus, FocusRule> = {
  Push: { primary: ["chest", "shoulders", "triceps"], secondary: [], priorityPatterns: ["horizontal-press", "vertical-press", "elbow-extension"] },
  Pull: { primary: ["back", "biceps", "shoulders"], secondary: [], priorityPatterns: ["vertical-pull", "horizontal-pull", "elbow-flexion"] },
  Legs: { primary: ["quads", "hamstrings", "glutes", "calves"], secondary: ["core"], priorityPatterns: ["squat", "hinge", "lunge"] },
  "Full Body": { primary: ["quads", "hamstrings", "glutes", "chest", "back"], secondary: ["shoulders", "core"], priorityPatterns: ["squat", "hinge", "horizontal-press", "horizontal-pull", "vertical-pull"] },
  Core: { primary: ["core"], secondary: [], priorityPatterns: ["core-stability"] },
  Conditioning: { primary: ["quads", "glutes", "core"], secondary: ["back"], priorityPatterns: ["lunge", "carry", "core-stability"] },
  Chest: { primary: ["chest"], secondary: ["triceps", "shoulders"], priorityPatterns: ["horizontal-press", "adduction"] },
  Back: { primary: ["back"], secondary: ["biceps"], priorityPatterns: ["vertical-pull", "horizontal-pull"] },
  Shoulders: { primary: ["shoulders"], secondary: ["triceps"], priorityPatterns: ["vertical-press", "abduction"] },
  Biceps: { primary: ["biceps"], secondary: [], priorityPatterns: ["elbow-flexion"] },
  Triceps: { primary: ["triceps"], secondary: [], priorityPatterns: ["elbow-extension"] },
  Glutes: { primary: ["glutes"], secondary: ["hamstrings"], priorityPatterns: ["hinge", "lunge"] },
  Hamstrings: { primary: ["hamstrings"], secondary: ["glutes"], priorityPatterns: ["hinge"] },
  Quads: { primary: ["quads"], secondary: ["glutes"], priorityPatterns: ["squat", "lunge"] },
  Calves: { primary: ["calves"], secondary: [], priorityPatterns: ["carry"] },
  Arms: { primary: ["biceps", "triceps"], secondary: ["shoulders"], priorityPatterns: ["elbow-flexion", "elbow-extension"] },
  "Rear Delts": { primary: ["shoulders"], secondary: ["back"], priorityPatterns: ["horizontal-pull", "abduction"] },
};

function allowedByEquipment(ex: ExerciseMeta, equipmentContext: string): boolean {
  const e = equipmentContext.toLowerCase();
  if (!e || e.includes("full gym")) return true;
  if (e.includes("dumbbell only")) return ex.equipment.every((x) => x === "dumbbell" || x === "bodyweight" || x === "bench");
  if (e.includes("bodyweight")) return ex.equipment.every((x) => x === "bodyweight");
  if (e.includes("machine")) return ex.equipment.some((x) => x === "machine");
  if (e.includes("cable")) return ex.equipment.some((x) => x === "cable");
  return true;
}

export function scoreExercise(args: {
  ex: ExerciseMeta;
  focus: Focus;
  sleep: number;
  energy: number;
  soreness: number;
  note: string;
  recent: string[];
  usedPatterns: Set<MovementPattern>;
  equipmentContext: string;
  memory?: AdaptiveMemory;
  emphasis?: ParsedEmphasis | null;
  emphasisTargets?: EmphasisScoringTargets | null;
}) {
  const { ex, focus, sleep, energy, soreness, note, recent, usedPatterns, equipmentContext, memory, emphasis, emphasisTargets } = args;
  const f = FOCUS_RULES[focus];
  const n = note.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (f.primary.includes(ex.primaryMuscle)) { score += 10; reasons.push("focus-primary-muscle"); }
  else if (f.secondary.includes(ex.primaryMuscle)) { score += 4; reasons.push("focus-secondary-muscle"); }
  if (f.priorityPatterns.includes(ex.movementPattern)) { score += 6; reasons.push("focus-priority-pattern"); }
  if (ex.kind === "compound") { score += 2; reasons.push("compound-priority"); }
  if (usedPatterns.has(ex.movementPattern)) { score -= 4; reasons.push("duplicate-pattern-penalty"); }
  if (!allowedByEquipment(ex, equipmentContext)) { score -= 20; reasons.push("equipment-mismatch-penalty"); }

  const tired = sleep < 6 || energy <= 4;
  if (tired && ex.fatigueCost >= 7) { score -= 5; reasons.push("fatigue-penalty-low-readiness"); }
  if (soreness >= 7 && ex.jointStress === "high") { score -= 8; reasons.push("high-joint-stress-penalty"); }
  if (soreness >= 7 && ex.jointStress === "low") { score += 4; reasons.push("joint-friendly-bonus"); }
  if (n.includes("shoulder") && ex.movementPattern === "vertical-press") { score -= 12; reasons.push("shoulder-constraint-penalty"); }
  if ((n.includes("knee") || n.includes("patellar")) && ex.movementPattern === "squat") { score -= 10; reasons.push("knee-constraint-penalty"); }
  if (n.includes("back pain") && ex.movementPattern === "hinge") { score -= 12; reasons.push("back-constraint-penalty"); }
  if (n.includes("elbow") && (ex.movementPattern === "elbow-extension" || ex.movementPattern === "elbow-flexion")) { score -= 8; reasons.push("elbow-constraint-penalty"); }

  // Variety pressure from recent history
  const recentCanon = new Set(recent.map(canonicalName));
  if (recentCanon.has(canonicalName(ex.name))) { score -= 9; reasons.push("recent-repetition-penalty"); }

  // Adaptive memory soft modifiers
  const patternKey = ex.movementPattern;
  const fav = memory?.favoritePatterns?.[patternKey] ?? 0;
  const skip = memory?.skippedPatterns?.[patternKey] ?? 0;
  const fail = memory?.failedCompletionPatterns?.[patternKey] ?? 0;
  const pain = memory?.recurringPainConstraints?.[ex.primaryMuscle] ?? 0;
  if (fav > 0) { const v = Math.min(4, fav * 0.4); score += v; reasons.push("favorite-pattern-bonus"); }
  if (skip > 0) { const v = Math.min(5, skip * 0.6); score -= v; reasons.push("skip-pattern-penalty"); }
  if (fail > 0) { const v = Math.min(5, fail * 0.5); score -= v; reasons.push("failed-completion-penalty"); }
  if (pain > 0 && ex.jointStress !== "low") { const v = Math.min(6, pain * 0.7); score -= v; reasons.push("pain-memory-penalty"); }

  if (emphasis) {
    const unc = emphasisTargets?.uncoveredMuscles;
    if (unc && unc.size > 0 && unc.has(ex.primaryMuscle)) {
      score += 28;
      reasons.push("user-emphasis-uncovered-primary");
    } else if (emphasis.muscles.length > 0 && emphasis.muscles.includes(ex.primaryMuscle)) {
      score += 11;
      reasons.push("user-emphasis-primary");
    }

    if (unc && unc.size > 0 && ex.secondaryMuscles.some((s) => unc.has(s))) {
      score += 8;
      reasons.push("user-emphasis-uncovered-secondary");
    } else if (emphasis.muscles.length > 0 && emphasis.muscles.some((m) => ex.secondaryMuscles.includes(m))) {
      score += 5;
      reasons.push("user-emphasis-secondary");
    }

    if (emphasisTargets?.needRearDeltTag && ex.pivotTags.includes("rear-delt")) {
      score += 26;
      reasons.push("user-emphasis-rear-delt-priority");
    } else if (emphasis.rearDeltBoost && ex.pivotTags.includes("rear-delt")) {
      score += 9;
      reasons.push("user-emphasis-rear-delt");
    }

    if (emphasisTargets?.needForearmFlex && ex.movementPattern === "elbow-flexion") {
      score += 22;
      reasons.push("user-emphasis-forearms-priority");
    } else if (emphasis.forearmsBoost && ex.movementPattern === "elbow-flexion") {
      score += 10;
      reasons.push("user-emphasis-forearms");
    }
  }

  return { score, reasons };
}

export function estimateSessionMinutes(exercises: ExerciseMeta[], setsScheme: number[]): number {
  let totalSec = 0;
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const sets = setsScheme[i] ?? 3;
    const workSec = Math.max(25, Math.floor(ex.estimatedTimeSec / 6));
    const restSec = ex.kind === "compound" ? 90 : 55;
    totalSec += sets * workSec + Math.max(0, sets - 1) * restSec + 35; // transition
  }
  return Math.max(8, Math.round(totalSec / 60));
}

export function chooseExercises(args: {
  focus: Focus;
  maxExercises: number;
  sleep: number;
  energy: number;
  soreness: number;
  note: string;
  recentExercises: string[];
  equipmentContext: string;
  memory?: AdaptiveMemory;
  emphasis?: ParsedEmphasis | null;
}) {
  const usedPatterns = new Set<MovementPattern>();
  const picked: ExerciseMeta[] = [];
  const rejected: Array<{ exercise: string; reason: string }> = [];
  let lastSorted: { ex: ExerciseMeta; score: number }[] = [];
  let lastDebugScoring: ScoringBreakdown[] = [];

  const tryAcceptOne = (item: { ex: ExerciseMeta; score: number }): boolean => {
    const ex = item.ex;
    if (item.score < 0) {
      rejected.push({ exercise: ex.name, reason: "score-below-zero" });
      return false;
    }
    const dupPrimary = picked.filter((p) => p.primaryMuscle === ex.primaryMuscle).length;
    if (dupPrimary >= 2) {
      rejected.push({ exercise: ex.name, reason: "primary-muscle-overconcentration" });
      return false;
    }
    if (picked.some((p) => canonicalName(p.name) === canonicalName(ex.name))) {
      rejected.push({ exercise: ex.name, reason: "duplicate-exercise" });
      return false;
    }
    if (args.focus === "Full Body") {
      const hasPush = picked.some((p) => p.movementPattern === "horizontal-press" || p.movementPattern === "vertical-press");
      const hasPull = picked.some((p) => p.movementPattern === "horizontal-pull" || p.movementPattern === "vertical-pull");
      if (picked.length >= args.maxExercises - 1) {
        const thisIsPush = ex.movementPattern === "horizontal-press" || ex.movementPattern === "vertical-press";
        const thisIsPull = ex.movementPattern === "horizontal-pull" || ex.movementPattern === "vertical-pull";
        if (!hasPush && !thisIsPush) {
          rejected.push({ exercise: ex.name, reason: "full-body-push-balance-protection" });
          return false;
        }
        if (!hasPull && !thisIsPull) {
          rejected.push({ exercise: ex.name, reason: "full-body-pull-balance-protection" });
          return false;
        }
      }
    }
    picked.push(ex);
    usedPatterns.add(ex.movementPattern);
    return true;
  };

  while (picked.length < args.maxExercises) {
    const emphasisTargets = buildEmphasisTargets(args.emphasis, picked);
    const sorted = [...EXERCISES]
      .map((ex) => {
        const evald = scoreExercise({
          ...args,
          ex,
          recent: args.recentExercises,
          usedPatterns,
          equipmentContext: args.equipmentContext,
          memory: args.memory,
          emphasis: args.emphasis,
          emphasisTargets,
        });
        return { ex, score: evald.score, reasons: evald.reasons };
      })
      .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));

    lastSorted = sorted.map(({ ex, score }) => ({ ex, score }));
    lastDebugScoring = sorted.map(({ ex, score, reasons }) => ({ exercise: ex.name, score, reasons }));

    let pickedThisRound = false;
    for (const item of sorted) {
      if (tryAcceptOne({ ex: item.ex, score: item.score })) {
        pickedThisRound = true;
        break;
      }
    }
    if (!pickedThisRound) break;
  }

  const ordered = orderPickedForEmphasis(picked, args.emphasis);

  return {
    picked: ordered,
    ranked: lastSorted.slice(0, Math.max(args.maxExercises + 4, 8)),
    debug: { scoring: lastDebugScoring, rejected },
  };
}

export function inferFocus(raw: string): Focus {
  const s = String(raw ?? "").trim();
  if (FOCUS_LIST.includes(s as Focus)) return s as Focus;
  const first = s.split(/\s*(?:·|•|—)\s*/)[0]?.trim() ?? "";
  if (FOCUS_LIST.includes(first as Focus)) return first as Focus;
  return "Push";
}
