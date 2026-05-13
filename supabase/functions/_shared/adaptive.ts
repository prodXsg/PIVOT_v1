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

/** Optional user emphasis (multi) layered on Push/Pull/Legs/Full Body — scored first, then minimally guaranteed when feasible. */
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

type EmphasisGuaranteeKind = "muscle" | "rear-delt" | "forearms";
type EmphasisGuaranteeTarget = { kind: EmphasisGuaranteeKind; muscle?: Muscle };

function buildEmphasisTargets(emphasis: ParsedEmphasis | null | undefined, picked: ExerciseMeta[]): EmphasisScoringTargets | null {
  if (!emphasis) return null;
  const uncoveredMuscles = new Set<Muscle>();
  for (const m of emphasis.muscles) {
    if (!picked.some((p) => p.primaryMuscle === m)) uncoveredMuscles.add(m);
  }
  const needRearDeltTag = !!(emphasis.rearDeltBoost && !picked.some((p) => p.pivotTags.includes("rear-delt")));
  const needForearmFlex = !!(emphasis.forearmsBoost && !picked.some((p) => isForearmIntentExercise(p)));
  if (!uncoveredMuscles.size && !needRearDeltTag && !needForearmFlex) return null;
  return { uncoveredMuscles, needRearDeltTag, needForearmFlex };
}

/** Explicit user intents that must stay visible under compression (minimum representation guarantees). */
function countCrossDomainExplicitSelections(emphasis: ParsedEmphasis | null | undefined): number {
  if (!emphasis) return 0;
  let n = 0;
  if (emphasis.muscles.includes("core")) n++;
  if (emphasis.muscles.includes("calves")) n++;
  if (emphasis.rearDeltBoost) n++;
  if (emphasis.forearmsBoost) n++;
  return n;
}

/**
 * Missing guarantee targets ordered for graceful degradation:
 * core → calves → rear delts → forearms → insertion-required muscles (e.g. shoulders on Legs) → structural-fit emphasis (hamstrings on Legs).
 */
function listMissingEmphasisTargets(
  emphasisTargets: EmphasisScoringTargets | null | undefined,
  focus: Focus,
): EmphasisGuaranteeTarget[] {
  if (!emphasisTargets) return [];
  const muscleTargets: EmphasisGuaranteeTarget[] = [];
  for (const m of emphasisTargets.uncoveredMuscles) {
    muscleTargets.push({ kind: "muscle", muscle: m });
  }
  const crossMuscles = muscleTargets.filter((t) => t.kind === "muscle" && (t.muscle === "core" || t.muscle === "calves"));
  const structuralMuscles = muscleTargets.filter((t) => t.kind === "muscle" && t.muscle !== "core" && t.muscle !== "calves");
  crossMuscles.sort((a, b) => {
    const rank = (m: Muscle | undefined) => (m === "core" ? 0 : m === "calves" ? 1 : 9);
    return rank(a.muscle) - rank(b.muscle) || String(a.muscle).localeCompare(String(b.muscle));
  });

  const insertionMuscles = structuralMuscles.filter(
    (t) => t.kind === "muscle" && t.muscle !== undefined && !isMuscleStructuralForFocus(focus, t.muscle),
  );
  const structuralFitMuscles = structuralMuscles.filter(
    (t) => t.kind === "muscle" && t.muscle !== undefined && isMuscleStructuralForFocus(focus, t.muscle),
  );

  const specials: EmphasisGuaranteeTarget[] = [];
  if (emphasisTargets.needRearDeltTag) specials.push({ kind: "rear-delt" });
  if (emphasisTargets.needForearmFlex) specials.push({ kind: "forearms" });

  return [...crossMuscles, ...specials, ...insertionMuscles, ...structuralFitMuscles];
}

function exerciseMatchesEmphasisTarget(ex: ExerciseMeta, target: EmphasisGuaranteeTarget): boolean {
  if (target.kind === "muscle") return target.muscle === ex.primaryMuscle;
  if (target.kind === "rear-delt") return ex.pivotTags.includes("rear-delt");
  return isForearmIntentExercise(ex);
}

function exerciseMatchesAnyEmphasisTarget(ex: ExerciseMeta, targets: EmphasisGuaranteeTarget[]): boolean {
  for (const target of targets) {
    if (exerciseMatchesEmphasisTarget(ex, target)) return true;
  }
  return false;
}

function emphasisTargetCount(emphasis: ParsedEmphasis | null | undefined): number {
  if (!emphasis) return 0;
  return emphasis.muscles.length + (emphasis.rearDeltBoost ? 1 : 0) + (emphasis.forearmsBoost ? 1 : 0);
}

function isDirectEmphasisExercise(ex: ExerciseMeta, emphasis: ParsedEmphasis | null | undefined): boolean {
  if (!emphasis) return false;
  if (emphasis.muscles.includes(ex.primaryMuscle)) return true;
  if (emphasis.rearDeltBoost && ex.pivotTags.includes("rear-delt")) return true;
  if (emphasis.forearmsBoost && isForearmIntentExercise(ex)) return true;
  return false;
}

function isForearmIntentExercise(ex: ExerciseMeta): boolean {
  return ex.pivotTags.includes("forearm-bias") || ex.pivotTags.includes("grip-bias");
}

function isDirectEmphasisForOrdering(ex: ExerciseMeta, emphasis: ParsedEmphasis | null | undefined): boolean {
  return isDirectEmphasisExercise(ex, emphasis);
}

/** Coach-like flow: lower compounds → upper push compounds → upper pull compounds → accessories (emphasis-first, then easier finishers). */
function orderPickedCoachLike(
  picked: ExerciseMeta[],
  focus: Focus,
  emphasis: ParsedEmphasis | null | undefined,
): ExerciseMeta[] {
  const posteriorLowerBias =
    !!emphasis &&
    (emphasis.muscles.includes("hamstrings") || emphasis.muscles.includes("glutes"));

  const isLowerCompound = (ex: ExerciseMeta) =>
    ex.kind === "compound" && (ex.movementPattern === "squat" || ex.movementPattern === "hinge" || ex.movementPattern === "lunge");
  const isUpperPushCompound = (ex: ExerciseMeta) =>
    ex.kind === "compound" &&
    (ex.movementPattern === "horizontal-press" || ex.movementPattern === "vertical-press" || ex.movementPattern === "adduction");
  const isUpperPullCompound = (ex: ExerciseMeta) =>
    ex.kind === "compound" &&
    (ex.movementPattern === "vertical-pull" || ex.movementPattern === "horizontal-pull");

  const lowerC = picked.filter(isLowerCompound);
  const upperPushC = picked.filter(isUpperPushCompound);
  const upperPullC = picked.filter(isUpperPullCompound);
  const accessory = picked.filter(
    (ex) => !isLowerCompound(ex) && !isUpperPushCompound(ex) && !isUpperPullCompound(ex),
  );

  const hingeFirst = (a: ExerciseMeta, b: ExerciseMeta) => {
    const rank = (ex: ExerciseMeta) => {
      if (ex.movementPattern === "hinge") return posteriorLowerBias ? 0 : 1;
      if (ex.movementPattern === "squat") return posteriorLowerBias ? 1 : 0;
      return 2; // lunge
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.fatigueCost - a.fatigueCost || a.name.localeCompare(b.name);
  };

  const heavyCompoundFirst = (a: ExerciseMeta, b: ExerciseMeta) =>
    b.fatigueCost - a.fatigueCost || a.name.localeCompare(b.name);

  const accessorySort = (a: ExerciseMeta, b: ExerciseMeta) => {
    const da = isDirectEmphasisForOrdering(a, emphasis) ? 0 : 1;
    const db = isDirectEmphasisForOrdering(b, emphasis) ? 0 : 1;
    if (da !== db) return da - db;
    // Core / calves often feel better as session finishers (low fatigue, local).
    const finisher = (ex: ExerciseMeta) =>
      ex.primaryMuscle === "core" || ex.primaryMuscle === "calves" ? 1 : 0;
    const fa = finisher(a);
    const fb = finisher(b);
    if (fa !== fb) return fa - fb;
    return a.fatigueCost - b.fatigueCost || a.name.localeCompare(b.name);
  };

  lowerC.sort(hingeFirst);
  upperPushC.sort(heavyCompoundFirst);
  upperPullC.sort(heavyCompoundFirst);
  accessory.sort(accessorySort);

  // Full Body: classic flow lower → push → pull → accessories; other focuses keep relative compound blocks then accessories.
  if (focus === "Full Body") {
    return [...lowerC, ...upperPushC, ...upperPullC, ...accessory];
  }
  if (focus === "Legs") {
    return [...lowerC, ...accessory];
  }
  if (focus === "Push") {
    return [...upperPushC, ...accessory];
  }
  if (focus === "Pull") {
    return [...upperPullC, ...accessory];
  }
  // Default: compounds first (lower if any), then mixed accessories.
  const compounds = picked.filter((ex) => ex.kind === "compound");
  const acc = picked.filter((ex) => ex.kind !== "compound");
  compounds.sort(heavyCompoundFirst);
  acc.sort(accessorySort);
  return [...compounds, ...acc];
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
  { name: "Dumbbell Bench Press", primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], movementPattern: "horizontal-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 420, fatigueCost: 7, pivotTags: ["no-barbell", "bench-required", "chest-dominant-push"], kind: "compound" },
  { name: "Machine Chest Press", primaryMuscle: "chest", secondaryMuscles: ["triceps"], movementPattern: "horizontal-press", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["joint-friendly", "chest-dominant-push"], kind: "compound" },
  { name: "Incline Dumbbell Press", primaryMuscle: "chest", secondaryMuscles: ["shoulders", "triceps"], movementPattern: "horizontal-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["bench-required", "chest-dominant-push"], kind: "compound" },
  { name: "Push-up Drop Set", primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], movementPattern: "horizontal-press", equipment: ["bodyweight"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 180, fatigueCost: 5, pivotTags: ["time-crunch", "no-equipment", "chest-dominant-push"], kind: "accessory" },
  { name: "Seated Dumbbell Shoulder Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], movementPattern: "vertical-press", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "high", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["overhead", "shoulder-dominant-push"], kind: "compound" },
  { name: "Machine Shoulder Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], movementPattern: "vertical-press", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["joint-friendly", "overhead", "shoulder-dominant-push"], kind: "compound" },
  { name: "Cable Lateral Raise", primaryMuscle: "shoulders", secondaryMuscles: [], movementPattern: "abduction", equipment: ["cable"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["shoulder-friendly"], kind: "accessory" },
  { name: "Dumbbell Lateral Raise", primaryMuscle: "shoulders", secondaryMuscles: [], movementPattern: "abduction", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["no-cable"], kind: "accessory" },
  { name: "Triceps Rope Pushdown", primaryMuscle: "triceps", secondaryMuscles: [], movementPattern: "elbow-extension", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 3, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Overhead Cable Triceps Extension", primaryMuscle: "triceps", secondaryMuscles: [], movementPattern: "elbow-extension", equipment: ["cable"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["overhead"], kind: "accessory" },
  { name: "Pec Deck Fly", primaryMuscle: "chest", secondaryMuscles: ["shoulders"], movementPattern: "adduction", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["joint-friendly", "chest-dominant-push"], kind: "accessory" },
  { name: "Lat Pulldown", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "vertical-pull", equipment: ["cable", "machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["no-pullup"], kind: "compound" },
  { name: "Assisted Pull-Up", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "vertical-pull", equipment: ["machine"], unilateral: false, jointStress: "high", level: "intermediate", estimatedTimeSec: 360, fatigueCost: 7, pivotTags: ["pullup"], kind: "compound" },
  { name: "Seated Cable Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "horizontal-pull", equipment: ["cable"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["stable"], kind: "compound" },
  { name: "Chest-Supported Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], movementPattern: "horizontal-pull", equipment: ["dumbbell", "bench"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 390, fatigueCost: 6, pivotTags: ["lower-back-friendly"], kind: "compound" },
  { name: "One-Arm Dumbbell Row", primaryMuscle: "back", secondaryMuscles: ["biceps", "core"], movementPattern: "horizontal-pull", equipment: ["dumbbell", "bench"], unilateral: true, jointStress: "moderate", level: "beginner", estimatedTimeSec: 420, fatigueCost: 6, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Face Pull", primaryMuscle: "shoulders", secondaryMuscles: ["back"], movementPattern: "horizontal-pull", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["rear-delt"], kind: "accessory" },
  { name: "Reverse Pec Deck", primaryMuscle: "shoulders", secondaryMuscles: ["back"], movementPattern: "horizontal-pull", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["rear-delt"], kind: "accessory" },
  { name: "Dumbbell Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms"], kind: "accessory" },
  { name: "Cable Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["cable"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms"], kind: "accessory" },
  { name: "Hammer Curl", primaryMuscle: "biceps", secondaryMuscles: [], movementPattern: "elbow-flexion", equipment: ["dumbbell"], unilateral: true, jointStress: "low", level: "beginner", estimatedTimeSec: 210, fatigueCost: 3, pivotTags: ["arms", "forearm-bias", "grip-bias"], kind: "accessory" },
  { name: "Goblet Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes", "core"], movementPattern: "squat", equipment: ["dumbbell"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["no-rack", "quad-dominant-lower"], kind: "compound" },
  { name: "Leg Press", primaryMuscle: "quads", secondaryMuscles: ["glutes"], movementPattern: "squat", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["knee-load", "quad-dominant-lower"], kind: "compound" },
  { name: "Romanian Deadlift", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "back"], movementPattern: "hinge", equipment: ["dumbbell", "barbell"], unilateral: false, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 420, fatigueCost: 8, pivotTags: ["posterior-chain", "hinge-dominant-lower"], kind: "compound" },
  { name: "Seated Leg Curl", primaryMuscle: "hamstrings", secondaryMuscles: [], movementPattern: "hinge", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["joint-friendly"], kind: "accessory" },
  { name: "Leg Extension", primaryMuscle: "quads", secondaryMuscles: [], movementPattern: "squat", equipment: ["machine"], unilateral: false, jointStress: "moderate", level: "beginner", estimatedTimeSec: 240, fatigueCost: 4, pivotTags: ["joint-friendly", "quad-dominant-lower"], kind: "accessory" },
  { name: "Walking Lunges", primaryMuscle: "glutes", secondaryMuscles: ["quads", "hamstrings"], movementPattern: "lunge", equipment: ["dumbbell", "bodyweight"], unilateral: true, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 390, fatigueCost: 7, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Split Squat", primaryMuscle: "glutes", secondaryMuscles: ["quads"], movementPattern: "lunge", equipment: ["dumbbell", "bodyweight"], unilateral: true, jointStress: "moderate", level: "intermediate", estimatedTimeSec: 360, fatigueCost: 6, pivotTags: ["unilateral"], kind: "compound" },
  { name: "Hip Thrust (Machine)", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], movementPattern: "hinge", equipment: ["machine"], unilateral: false, jointStress: "low", level: "beginner", estimatedTimeSec: 330, fatigueCost: 6, pivotTags: ["glute-focused", "posterior-chain", "hinge-dominant-lower"], kind: "compound" },
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

/** Whether this muscle maps onto Layer 1 primary/secondary for the session focus (reshapes existing slots). */
function isMuscleStructuralForFocus(focus: Focus, muscle: Muscle): boolean {
  const rule = FOCUS_RULES[focus];
  return rule.primary.includes(muscle) || rule.secondary.includes(muscle);
}

function isDirectInsertionIntentExercise(ex: ExerciseMeta, focus: Focus, emphasis: ParsedEmphasis | null | undefined): boolean {
  if (!emphasis) return false;
  if (emphasis.forearmsBoost && isForearmIntentExercise(ex) && !isMuscleStructuralForFocus(focus, "biceps")) return true;
  if (emphasis.rearDeltBoost && ex.pivotTags.includes("rear-delt") && !isMuscleStructuralForFocus(focus, "shoulders")) return true;
  return emphasis.muscles.some((m) => m === ex.primaryMuscle && !isMuscleStructuralForFocus(focus, m));
}

/** Explicit emphasis muscles that require structural insertion (e.g. shoulders on Legs — not parasitic on lower slots). */
function countInsertionIntentEmphasis(emphasis: ParsedEmphasis | null | undefined, focus: Focus): number {
  if (!emphasis) return 0;
  return emphasis.muscles.filter((m) => !isMuscleStructuralForFocus(focus, m)).length;
}

/**
 * Minimum direct-emphasis picks so Layer 2 stays visibly intentional:
 * cross-domain bundle (core/calves/rear/forearms) + insertion-required muscles (non-structural for focus).
 */
function countLayer2VisibilityFloor(emphasis: ParsedEmphasis | null | undefined, focus: Focus): number {
  if (!emphasis) return 0;
  return countCrossDomainExplicitSelections(emphasis) + countInsertionIntentEmphasis(emphasis, focus);
}

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
    // Layer-2 structural reinterpretation: emphasis biases how identity slots are filled (coach-like, perceptual).
    const shouldersEmphasis = emphasis.muscles.includes("shoulders");
    if (shouldersEmphasis && (focus === "Full Body" || focus === "Push")) {
      if (ex.pivotTags.includes("chest-dominant-push")) {
        score -= 10;
        reasons.push("emphasis-shoulders-deprioritize-chest-push");
      }
      if (ex.pivotTags.includes("shoulder-dominant-push")) {
        score += 11;
        reasons.push("emphasis-shoulders-prioritize-shoulder-push");
      }
      if (ex.primaryMuscle === "shoulders" && ex.movementPattern === "abduction") {
        score += 7;
        reasons.push("emphasis-shoulders-isolation-rail");
      }
    }

    const hamEmphasis = emphasis.muscles.includes("hamstrings");
    const gluteEmphasis = emphasis.muscles.includes("glutes");
    if ((hamEmphasis || gluteEmphasis) && (focus === "Full Body" || focus === "Legs")) {
      if (ex.pivotTags.includes("posterior-chain") || ex.pivotTags.includes("hinge-dominant-lower")) {
        score += 9;
        reasons.push("emphasis-posterior-lower-priority");
      }
      if (hamEmphasis && ex.pivotTags.includes("quad-dominant-lower") && ex.kind === "compound") {
        score -= 7;
        reasons.push("emphasis-hamstrings-soft-deprioritize-quad-compound");
      }
    }

    if (gluteEmphasis && (ex.pivotTags.includes("glute-focused") || (ex.primaryMuscle === "glutes" && ex.kind === "compound"))) {
      score += 8;
      reasons.push("emphasis-glutes-structural");
    }

    if (emphasis.rearDeltBoost && (focus === "Pull" || focus === "Full Body")) {
      if (ex.pivotTags.includes("rear-delt")) {
        score += 10;
        reasons.push("emphasis-rear-delt-pull-shape");
      }
    }

    if (emphasis.muscles.includes("chest")) {
      if (ex.pivotTags.includes("chest-dominant-push")) {
        score += 8;
        reasons.push("emphasis-chest-semantic-priority");
      } else if (ex.pivotTags.includes("shoulder-dominant-push")) {
        score -= 5;
        reasons.push("emphasis-chest-soft-shoulder-push-penalty");
      }
    }

    if (
      (focus === "Full Body" || focus === "Push") &&
      !emphasis.muscles.includes("chest") &&
      ex.pivotTags.includes("chest-dominant-push") &&
      ex.kind === "compound"
    ) {
      score -= 6;
      reasons.push("diversity-non-chest-emphasis-soft-penalty");
    }

    // Explicit Layer 2 muscle not mapped onto Layer 1 (e.g. shoulders on Legs): perceptual priority for insertion.
    if (
      emphasis.muscles.some((m) => m === ex.primaryMuscle && !isMuscleStructuralForFocus(focus, m))
    ) {
      score += 10;
      reasons.push("layer2-insertion-intent-coherence");
    }

    const unc = emphasisTargets?.uncoveredMuscles;
    if (unc && unc.size > 0 && unc.has(ex.primaryMuscle)) {
      score += 34;
      reasons.push("user-emphasis-uncovered-primary");
    } else if (emphasis.muscles.length > 0 && emphasis.muscles.includes(ex.primaryMuscle)) {
      score += 14;
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
      score += 30;
      reasons.push("user-emphasis-rear-delt-priority");
    } else if (emphasis.rearDeltBoost && ex.pivotTags.includes("rear-delt")) {
      score += 12;
      reasons.push("user-emphasis-rear-delt");
    }

    if (emphasisTargets?.needForearmFlex && isForearmIntentExercise(ex)) {
      score += 28;
      reasons.push("user-emphasis-forearms-priority");
    } else if (emphasis.forearmsBoost && isForearmIntentExercise(ex)) {
      score += 13;
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
  const arbitrationDebug: {
    activated?: boolean;
    earlyExit?: string;
    focus?: Focus;
    maxExercises?: number;
    missingTargets?: EmphasisGuaranteeTarget[];
    layer2InsertionTargets?: EmphasisGuaranteeTarget[];
    anchors?: MovementPattern[];
    haveAnchors?: boolean;
    anchorSlotsCount?: number;
    hasRedundantStructuralSlots?: boolean;
    protectedIndices?: number[];
    patternCounts?: Record<string, number>;
    chosenReplaceIdx?: number;
    chosenReplaceExercise?: string;
    candidateScores?: Array<{ target: EmphasisGuaranteeTarget; candidate: string; score: number | null; reason?: string }>;
    replacedWith?: string;
    replacementFailed?: string;
  } | null = shouldDebugAdaptive()
    ? { focus: args.focus, maxExercises: args.maxExercises }
    : null;

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
    if (args.focus === "Push" && (ex.movementPattern === "horizontal-pull" || ex.movementPattern === "vertical-pull") && ex.kind === "compound") {
      if (!isDirectInsertionIntentExercise(ex, args.focus, args.emphasis)) {
        rejected.push({ exercise: ex.name, reason: "focus-purity-push-no-pull-compound" });
        return false;
      }
    }
    if (args.focus === "Pull" && (ex.pivotTags.includes("chest-dominant-push") || ex.movementPattern === "horizontal-press" || ex.movementPattern === "adduction") && ex.kind === "compound") {
      if (!isDirectInsertionIntentExercise(ex, args.focus, args.emphasis)) {
        rejected.push({ exercise: ex.name, reason: "focus-purity-pull-no-chest-push-compound" });
        return false;
      }
    }
    if (args.focus === "Legs" && ex.kind === "compound" && (ex.movementPattern === "horizontal-press" || ex.movementPattern === "vertical-press" || ex.movementPattern === "horizontal-pull" || ex.movementPattern === "vertical-pull" || ex.movementPattern === "adduction")) {
      if (!isDirectInsertionIntentExercise(ex, args.focus, args.emphasis)) {
        rejected.push({ exercise: ex.name, reason: "focus-purity-legs-no-unrelated-upper-compound" });
        return false;
      }
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
    const missingTargets = listMissingEmphasisTargets(emphasisTargets, args.focus);
    // Preserve workout identity first, then reserve remaining capacity for explicit emphasis guarantees.
    const identityReserve =
      args.focus === "Full Body"
        ? Math.min(2, Math.max(1, args.maxExercises - 1))
        : Math.min(3, Math.max(2, args.maxExercises - 1));
    const emphasisCapacity = Math.max(0, args.maxExercises - identityReserve);
    const requestedEmphasisCount = emphasisTargetCount(args.emphasis);
    const compressedSession = args.maxExercises <= 4;
    const readinessStrain = args.soreness >= 7 || args.energy <= 4 || args.sleep < 6;
    const conflictDeduction =
      (compressedSession && requestedEmphasisCount >= 3 ? 1 : 0) + (compressedSession && readinessStrain ? 1 : 0);
    const quotaRatio = compressedSession && readinessStrain ? 0.32 : compressedSession ? 0.36 : 0.4;
    /** Floor: Layer 2 visibility (cross-domain + insertion-required muscles vs focus, e.g. shoulders on Legs). */
    const layer2VisibilityFloor = Math.min(countLayer2VisibilityFloor(args.emphasis, args.focus), emphasisCapacity);
    const computedDirectQuota =
      requestedEmphasisCount <= 0
        ? 0
        : Math.min(
          emphasisCapacity,
          Math.max(1, requestedEmphasisCount - conflictDeduction),
          Math.max(1, Math.round(args.maxExercises * quotaRatio)),
        );
    const directEmphasisQuota =
      requestedEmphasisCount <= 0 ? 0 : Math.max(computedDirectQuota, layer2VisibilityFloor);
    const pickedDirectEmphasisCount = picked.filter((p) => isDirectEmphasisExercise(p, args.emphasis)).length;
    const neededDirectQuota = Math.max(0, directEmphasisQuota - pickedDirectEmphasisCount);
    const activeMissingTargets = missingTargets.slice(0, emphasisCapacity);
    const remainingSlots = args.maxExercises - picked.length;
    // Reserve final slots for explicit user emphasis guarantees.
    const mustReserveForEmphasis = activeMissingTargets.length > 0 && remainingSlots <= activeMissingTargets.length;
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
    /** Until direct-emphasis quota is met, evaluate matching exercises first so Layer 2 cannot be crowded out by Layer 1 fillers early (e.g. Legs + shoulders). */
    const directRanked = sorted.filter((x) => isDirectEmphasisExercise(x.ex, args.emphasis));
    const fillerRanked = sorted.filter((x) => !isDirectEmphasisExercise(x.ex, args.emphasis));
    const scanOrder =
      neededDirectQuota > 0 && directRanked.length ? [...directRanked, ...fillerRanked] : sorted;

    for (const item of scanOrder) {
      if (!isDirectEmphasisExercise(item.ex, args.emphasis) && neededDirectQuota > 0 && (remainingSlots - 1) < neededDirectQuota) {
        rejected.push({ exercise: item.ex.name, reason: "emphasis-direct-quota-reserved" });
        continue;
      }
      if (mustReserveForEmphasis && !exerciseMatchesAnyEmphasisTarget(item.ex, activeMissingTargets)) {
        rejected.push({ exercise: item.ex.name, reason: "emphasis-guarantee-slot-reserved" });
        continue;
      }
      if (tryAcceptOne({ ex: item.ex, score: item.score })) {
        pickedThisRound = true;
        break;
      }
    }
    if (!pickedThisRound) break;
  }

  // Lightweight post-pass: try one-for-one safe swaps to satisfy any still-missing explicit emphasis targets.
  const finalEmphasisTargets = buildEmphasisTargets(args.emphasis, picked);
  const finalMissing = listMissingEmphasisTargets(finalEmphasisTargets, args.focus);
  const finalIdentityReserve =
    args.focus === "Full Body"
      ? Math.min(2, Math.max(1, args.maxExercises - 1))
      : Math.min(3, Math.max(2, args.maxExercises - 1));
  const finalEmphasisCapacity = Math.max(0, args.maxExercises - finalIdentityReserve);
  const stillMissing = finalMissing.slice(0, finalEmphasisCapacity);
  if (stillMissing.length) {
    const focusRule = FOCUS_RULES[args.focus];
    for (const target of stillMissing) {
      const candidates = EXERCISES
        .filter((ex) => !picked.some((p) => canonicalName(p.name) === canonicalName(ex.name)))
        .filter((ex) => exerciseMatchesEmphasisTarget(ex, target))
        .map((ex) => {
          const evald = scoreExercise({
            ...args,
            ex,
            recent: args.recentExercises,
            usedPatterns: new Set(picked.map((p) => p.movementPattern)),
            equipmentContext: args.equipmentContext,
            memory: args.memory,
            emphasis: args.emphasis,
            emphasisTargets: finalEmphasisTargets,
          });
          return { ex, score: evald.score };
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));
      if (!candidates.length) continue;

      const candidate = candidates[0].ex;
      if (picked.some((p) => canonicalName(p.name) === canonicalName(candidate.name))) continue;
      const protectedNames = new Set(
        picked
          .filter((p) => {
            const isFocusPrimary = focusRule.primary.includes(p.primaryMuscle);
            const isFocusPattern = focusRule.priorityPatterns.includes(p.movementPattern);
            const isExplicitEmphasisDirect =
              !!args.emphasis &&
              (
                args.emphasis.muscles.includes(p.primaryMuscle) ||
                (args.emphasis.rearDeltBoost && p.pivotTags.includes("rear-delt")) ||
                (args.emphasis.forearmsBoost && isForearmIntentExercise(p))
              );
            return isFocusPrimary || isFocusPattern || isExplicitEmphasisDirect;
          })
          .map((p) => canonicalName(p.name)),
      );
      const replaceIdx = picked.findIndex((p) => !protectedNames.has(canonicalName(p.name)));
      if (replaceIdx < 0) continue;

      picked[replaceIdx] = candidate;
    }
  }

  // Post-selection marginal slot arbitration:
  // If Layer 1 identity is already satisfied and a Layer 2 emphasis is still missing,
  // replace a redundant low-marginal-utility structural slot with the best missing emphasis representation.
  {
    const emphasisTargetsNow = buildEmphasisTargets(args.emphasis, picked);
    const missingNow = listMissingEmphasisTargets(emphasisTargetsNow, args.focus);
    const layer2InsertionTargets = missingNow.filter((t) => {
      if (t.kind === "rear-delt" || t.kind === "forearms") return true;
      if (t.kind !== "muscle" || t.muscle === undefined) return false;
      if (t.muscle === "core" || t.muscle === "calves") return true;
      // Insertions like shoulders on Legs do not map onto that focus's structural boundary.
      return !isMuscleStructuralForFocus(args.focus, t.muscle);
    });

    const canArbitrate = args.maxExercises >= 6 && layer2InsertionTargets.length > 0;
    if (arbitrationDebug) {
      arbitrationDebug.missingTargets = missingNow;
      arbitrationDebug.layer2InsertionTargets = layer2InsertionTargets;
      arbitrationDebug.activated = !!canArbitrate;
      if (!canArbitrate) {
        arbitrationDebug.earlyExit = args.maxExercises < 6
          ? "capacity-too-small"
          : "no-layer2-insertion-targets-missing";
      }
    }
    if (canArbitrate) {
      const focusAnchors = (focus: Focus) => {
        if (focus === "Legs") return ["squat", "hinge", "lunge"] as MovementPattern[];
        if (focus === "Push") return ["horizontal-press", "vertical-press", "adduction"] as MovementPattern[];
        if (focus === "Pull") return ["vertical-pull", "horizontal-pull"] as MovementPattern[];
        if (focus === "Core") return ["core-stability"] as MovementPattern[];
        return ["squat", "hinge", "horizontal-press", "horizontal-pull"] as MovementPattern[];
      };

      // Check whether Layer 1 structural identity is already saturated and redundant slots exist.
      const anchors = focusAnchors(args.focus);
      const haveAnchors = anchors.every((p) => picked.some((ex) => ex.kind === "compound" && ex.movementPattern === p));
      const anchorSlotsCount = picked.filter((ex) => ex.kind === "compound" && anchors.includes(ex.movementPattern)).length;
      const hasRedundantStructuralSlots = haveAnchors && anchorSlotsCount > anchors.length;
      if (arbitrationDebug) {
        arbitrationDebug.anchors = anchors;
        arbitrationDebug.haveAnchors = haveAnchors;
        arbitrationDebug.anchorSlotsCount = anchorSlotsCount;
        arbitrationDebug.hasRedundantStructuralSlots = hasRedundantStructuralSlots;
        if (!hasRedundantStructuralSlots) {
          arbitrationDebug.earlyExit = !haveAnchors ? "identity-not-saturated-missing-anchor" : "no-redundant-anchor-slots";
        }
      }

      if (hasRedundantStructuralSlots) {
        // Protect foundational identity anchors and any exercises that already satisfy explicit Layer 2 intent.
        const protectedIndices = new Set<number>();
        for (const anchorPattern of anchors) {
          const idx = picked.findIndex((ex) => ex.kind === "compound" && ex.movementPattern === anchorPattern);
          if (idx >= 0) protectedIndices.add(idx);
        }
        for (let i = 0; i < picked.length; i++) {
          if (isDirectEmphasisExercise(picked[i], args.emphasis)) protectedIndices.add(i);
        }

        const patternCounts = new Map<MovementPattern, number>();
        for (const ex of picked) patternCounts.set(ex.movementPattern, (patternCounts.get(ex.movementPattern) ?? 0) + 1);
        if (arbitrationDebug) {
          arbitrationDebug.protectedIndices = [...protectedIndices].sort((a, b) => a - b);
          arbitrationDebug.patternCounts = [...patternCounts.entries()].reduce<Record<string, number>>((acc, [k, v]) => {
            acc[k] = v;
            return acc;
          }, {});
        }

        const marginalKeepValue = (ex: ExerciseMeta, idx: number) => {
          // Lower keepValue = better replacement candidate.
          let keep = 100;
          if (ex.kind === "accessory") keep -= 15;
          if (!isMuscleStructuralForFocus(args.focus, ex.primaryMuscle)) keep -= 25;
          const dup = (patternCounts.get(ex.movementPattern) ?? 0) - 1;
          keep -= Math.max(0, dup) * 22; // diminishing returns for duplicated structural patterns
          if (idx >= picked.length - 2) keep -= 8; // later structural redundancy is less marginal
          if (idx < 2) keep += 10; // early identity slots are more valuable
          return keep;
        };

        let replaceIdx = -1;
        let bestKeep = Infinity;
        for (let i = 0; i < picked.length; i++) {
          if (protectedIndices.has(i)) continue;
          const ex = picked[i];
          const keep = marginalKeepValue(ex, i);
          if (keep < bestKeep || (keep === bestKeep && ex.name.localeCompare(picked[replaceIdx]?.name ?? ""))) {
            bestKeep = keep;
            replaceIdx = i;
          }
        }
        if (arbitrationDebug) {
          arbitrationDebug.chosenReplaceIdx = replaceIdx >= 0 ? replaceIdx : undefined;
          arbitrationDebug.chosenReplaceExercise = replaceIdx >= 0 ? picked[replaceIdx]?.name : undefined;
        }

        if (replaceIdx >= 0) {
          const usedPatterns = new Set(picked.map((p) => p.movementPattern));
          const tryCandidate = (candidate: ExerciseMeta) => {
            const scoreEval = scoreExercise({
              ...args,
              ex: candidate,
              recent: args.recentExercises,
              usedPatterns,
              equipmentContext: args.equipmentContext,
              memory: args.memory,
              emphasis: args.emphasis,
              emphasisTargets: emphasisTargetsNow,
            }).score;

            if (scoreEval < 0) return null;
            const candName = canonicalName(candidate.name);
            if (picked.some((p, j) => j !== replaceIdx && canonicalName(p.name) === candName)) return null;

            const dupPrimaryAfter = picked
              .filter((p, j) => j !== replaceIdx)
              .filter((p) => p.primaryMuscle === candidate.primaryMuscle).length;
            if (dupPrimaryAfter >= 2) return null;

            // Focus purity boundaries (semantic prevention of cross-domain leakage).
            if (args.focus === "Push") {
              const isPullCompound =
                candidate.kind === "compound" &&
                (candidate.movementPattern === "horizontal-pull" || candidate.movementPattern === "vertical-pull");
              if (isPullCompound && !isDirectInsertionIntentExercise(candidate, args.focus, args.emphasis)) return null;
            }
            if (args.focus === "Pull") {
              const isChestPushCompound =
                candidate.kind === "compound" &&
                (candidate.pivotTags.includes("chest-dominant-push") ||
                  candidate.movementPattern === "horizontal-press" ||
                  candidate.movementPattern === "adduction");
              if (isChestPushCompound && !isDirectInsertionIntentExercise(candidate, args.focus, args.emphasis)) return null;
            }
            if (args.focus === "Legs") {
              const isUnrelatedUpperCompound =
                candidate.kind === "compound" &&
                (candidate.movementPattern === "horizontal-press" ||
                  candidate.movementPattern === "vertical-press" ||
                  candidate.movementPattern === "horizontal-pull" ||
                  candidate.movementPattern === "vertical-pull" ||
                  candidate.movementPattern === "adduction");
              if (isUnrelatedUpperCompound && !isDirectInsertionIntentExercise(candidate, args.focus, args.emphasis)) return null;
            }
            return scoreEval;
          };

          let bestCandidate: ExerciseMeta | null = null;
          let bestScore = -Infinity;
          if (arbitrationDebug) arbitrationDebug.candidateScores = [];

          for (const target of layer2InsertionTargets) {
            const candidates = EXERCISES
              .filter((ex) => !picked.some((p, j) => j !== replaceIdx && canonicalName(p.name) === canonicalName(ex.name)))
              .filter((ex) => exerciseMatchesEmphasisTarget(ex, target));
            for (const c of candidates) {
              const scoreEval = tryCandidate(c);
              if (arbitrationDebug) {
                arbitrationDebug.candidateScores!.push({
                  target,
                  candidate: c.name,
                  score: scoreEval,
                  reason: scoreEval === null ? "rejected-by-tryCandidate" : undefined,
                });
              }
              if (scoreEval === null) continue;
              if (
                scoreEval > bestScore ||
                (scoreEval === bestScore && c.name.localeCompare(bestCandidate?.name ?? "") < 0)
              ) {
                bestScore = scoreEval;
                bestCandidate = c;
              }
            }
          }

          if (bestCandidate) {
            picked[replaceIdx] = bestCandidate;
            if (arbitrationDebug) arbitrationDebug.replacedWith = bestCandidate.name;
          } else if (arbitrationDebug) {
            arbitrationDebug.replacementFailed = "no-viable-layer2-candidate";
          }
        } else if (arbitrationDebug) {
          arbitrationDebug.replacementFailed = "no-replaceable-slot-after-protection";
        }
      }
    }
  }

  const ordered = orderPickedCoachLike(picked, args.focus, args.emphasis);

  return {
    picked: ordered,
    ranked: lastSorted.slice(0, Math.max(args.maxExercises + 4, 8)),
    debug: { scoring: lastDebugScoring, rejected, arbitration: arbitrationDebug ?? undefined },
  };
}

export function inferFocus(raw: string): Focus {
  const s = String(raw ?? "").trim();
  if (FOCUS_LIST.includes(s as Focus)) return s as Focus;
  const first = s.split(/\s*(?:·|•|—)\s*/)[0]?.trim() ?? "";
  if (FOCUS_LIST.includes(first as Focus)) return first as Focus;
  return "Push";
}
