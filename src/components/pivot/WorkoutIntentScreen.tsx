import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { CheckIn, useApp } from "@/context/AppContext";

const STRUCTURE_CHIPS = ["Push", "Pull", "Legs", "Full Body"] as const;

const EMPHASIS_OPTIONS = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "rear-delts", label: "Rear delts" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "glutes", label: "Glutes" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "calves", label: "Calves" },
  { id: "abs-core", label: "Abs / core" },
  { id: "forearms", label: "Forearms" },
] as const;

const FOCUS_INFO =
  "Choose a session structure, then optionally layer emphasis. Pivot blends this into adaptation — not a fixed template.";

const MIN_LOAD_MS = 3000;

const LOADING_STAGES = [
  "Analyzing your readiness...",
  "Matching your intent...",
  "Building workout structure...",
  "Optimizing for your time window...",
  "Almost ready...",
];

export type ReadinessSnapshot = {
  sleep: number;
  energy: number;
  soreness: number;
  time: number;
};

function structureChipStyle(selected: boolean, animating: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 21,
    padding: "0 10px",
    fontSize: 13,
    fontWeight: selected ? 600 : 500,
    background: selected ? "#C7F73D" : "rgba(255,255,255,0.08)",
    color: selected ? "#000" : "rgba(255,255,255,0.60)",
    border: selected ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
    boxShadow: selected ? "0 0 0 2px rgba(199,247,61,0.25)" : "none",
    cursor: "pointer",
    whiteSpace: "normal",
    lineHeight: 1.1,
    transition: "background 180ms ease-out, color 180ms ease-out, box-shadow 180ms ease-out, transform 160ms ease-out",
    animation: animating ? "wi-chip-pop 200ms ease-out" : undefined,
  };
}

function emphasisChipStyle(selected: boolean, animating: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 13px",
    fontSize: 12,
    fontWeight: selected ? 600 : 500,
    background: selected ? "rgba(199,247,61,0.12)" : "rgba(255,255,255,0.06)",
    color: selected ? "#C7F73D" : "rgba(255,255,255,0.52)",
    border: selected ? "1px solid rgba(199,247,61,0.38)" : "1px solid rgba(255,255,255,0.10)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    transition: "background 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out, transform 160ms ease-out",
    animation: animating ? "wi-chip-pop 200ms ease-out" : undefined,
  };
}

export function WorkoutIntentScreen({
  readiness,
  onBack,
  onComplete,
}: {
  readiness: ReadinessSnapshot;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { generateWorkout, setTodayWorkout, incrementCheckInCount } = useApp();
  const [focusStructure, setFocusStructure] = useState<string | null>(null);
  const [focusEmphasis, setFocusEmphasis] = useState<string[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [chipAnim, setChipAnim] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = !!focusStructure;

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const interval = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
    }, 1500);
    return () => window.clearInterval(interval);
  }, [loading]);

  const animateChip = (key: string) => {
    setChipAnim((a) => ({ ...a, [key]: true }));
    window.setTimeout(() => {
      setChipAnim((a) => {
        const next = { ...a };
        delete next[key];
        return next;
      });
    }, 210);
  };

  const selectStructure = (value: string) => {
    setFocusStructure(value);
    setInfoOpen(false);
    animateChip(`focus-${value}`);
  };

  const toggleEmphasis = (id: string) => {
    if (!focusStructure) return;
    setFocusEmphasis((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    animateChip(`emp-${id}`);
  };

  const submit = async () => {
    if (!focusStructure || loading) return;
    setLoading(true);
    setError(null);
    const startedAt = Date.now();

    const checkIn: CheckIn = {
      ...readiness,
      focus: focusStructure,
      focusEmphasis: focusEmphasis.length ? focusEmphasis : undefined,
    };

    try {
      const workout = await generateWorkout(checkIn);
      if (!workout?.exercises?.length) {
        setLoading(false);
        setError("Could not build a valid workout for your constraints. Try again.");
        return;
      }
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOAD_MS - elapsed);
      window.setTimeout(() => {
        setTodayWorkout(workout);
        incrementCheckInCount();
        onComplete();
      }, wait);
    } catch {
      setLoading(false);
      setError("Couldn't generate a workout right now. Check connection and try again.");
    }
  };

  if (error && !loading) {
    return (
      <div className="absolute inset-0 flex flex-col bg-background overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)", animation: "wi-enter 280ms ease-out both" }}>
        <div className="flex items-center px-5 shrink-0" style={{ height: 56 }}>
          <button onClick={onBack} aria-label="Go back" className="size-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors shrink-0">
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="flex-1 text-center" style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
            Generation failed
          </h1>
          <div style={{ width: 36 }} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-foreground/70 leading-relaxed max-w-[300px]">{error}</p>
          <button
            type="button"
            onClick={submit}
            className="mt-6 w-full max-w-[320px] bg-primary text-primary-foreground rounded-full py-3.5 font-semibold text-sm active:scale-[0.99] transition-transform"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 flex justify-center" style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top) + 20px))" }}>
          <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: 6, color: "rgba(255,255,255,0.90)" }}>PIVOT</p>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(199,247,61,0.05) 0%, transparent 65%)",
            animation: "wi-bg-pulse 3s ease-in-out infinite",
          }}
        />
        <p key={stage} className="px-8 text-center" style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.92)", animation: "wi-stage 300ms ease-out both" }}>
          {LOADING_STAGES[stage]}
        </p>
        <div className="flex gap-1.5 mt-5">
          {LOADING_STAGES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === stage ? 20 : 6,
                height: 6,
                borderRadius: 999,
                background: i <= stage ? "#C7F73D" : "rgba(255,255,255,0.18)",
                transition: "width 300ms ease-out, background 300ms ease-out",
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes wi-stage { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes wi-bg-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", animation: "wi-enter 280ms ease-out both" }}
      onClick={() => setInfoOpen(false)}
    >
      <div className="shrink-0 px-5 pb-3" style={{ paddingTop: "max(6px, env(safe-area-inset-top))" }}>
        <div className="grid grid-cols-[40px_1fr_40px] items-start gap-1">
          <button
            onClick={onBack}
            aria-label="Go back"
            className="size-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors shrink-0"
            style={{ marginTop: 2 }}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex flex-col items-center text-center min-w-0 pt-0.5">
            <h1
              style={{
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: "-0.45px",
                lineHeight: 1.18,
                color: "hsl(var(--foreground))",
              }}
            >
              What do you want to train?
            </h1>
            <p
              style={{
                marginTop: 10,
                maxWidth: 300,
                marginLeft: "auto",
                marginRight: "auto",
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 1.5,
                color: "hsl(var(--foreground)/0.48)",
              }}
            >
              Tell Pivot how to steer today — structure first, then optional emphasis. Nothing here is a fixed template.
            </p>
          </div>
          <div aria-hidden style={{ width: 40 }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="flex items-start gap-2 mb-3" style={{ animation: "wi-rise 280ms ease-out both" }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--foreground)/0.42)" }}>
            Session structure
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInfoOpen((o) => !o);
            }}
            aria-label="More about training intent"
            className="shrink-0 flex items-center justify-center"
            style={{ width: 22, height: 22, marginTop: -1 }}
          >
            <Info size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.45)" }} />
          </button>
        </div>
        {infoOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-4 rounded-xl px-3 py-2.5"
            style={{
              background: "hsl(var(--surface-elevated))",
              border: "1px solid hsl(var(--foreground)/0.08)",
              fontSize: 12,
              lineHeight: 1.45,
              color: "hsl(var(--foreground)/0.72)",
              maxWidth: "100%",
              animation: "wi-tooltip 150ms ease-out both",
            }}
          >
            {FOCUS_INFO}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, animation: "wi-rise 280ms 40ms ease-out both" }}>
          {STRUCTURE_CHIPS.map((chip) => {
            const selected = focusStructure === chip;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={selected}
                aria-label={`Training structure: ${chip}`}
                className="pivot-intent-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  selectStructure(chip);
                }}
                style={{ ...structureChipStyle(selected, !!chipAnim[`focus-${chip}`]), fontSize: chip === "Full Body" ? 11 : 12, padding: "0 4px" }}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <p
          className="mt-8 mb-2"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "hsl(var(--foreground)/0.38)",
            animation: "wi-rise 280ms 80ms ease-out both",
          }}
        >
          Extra emphasis (optional)
        </p>
        <div
          className="flex flex-wrap gap-2"
          style={{
            opacity: focusStructure ? 1 : 0.38,
            pointerEvents: focusStructure ? "auto" : "none",
            animation: "wi-rise 280ms 100ms ease-out both",
          }}
        >
          {EMPHASIS_OPTIONS.map((opt) => {
            const selected = focusEmphasis.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                aria-label={`Emphasis: ${opt.label}`}
                className="pivot-intent-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEmphasis(opt.id);
                }}
                style={emphasisChipStyle(selected, !!chipAnim[`emp-${opt.id}`])}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 shrink-0" style={{ paddingTop: 8, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={submit}
          disabled={!canGenerate}
          aria-live="polite"
          className="relative w-full flex items-center justify-center font-bold active:scale-[0.97]"
          style={{
            height: 52,
            borderRadius: 26,
            fontSize: 15,
            background: canGenerate ? "#C7F73D" : "rgba(199,247,61,0.22)",
            color: canGenerate ? "#000" : "rgba(0,0,0,0.35)",
            border: "none",
            cursor: canGenerate ? "pointer" : "default",
            transition: "background 200ms ease-out, color 200ms ease-out, transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          Generate Workout
          {canGenerate && <ArrowRight size={18} style={{ position: "absolute", right: 16 }} />}
        </button>
      </div>

      <style>{`
        .pivot-intent-chip:active { transform: scale(0.96); transition: transform 120ms ease-out !important; }
        @keyframes wi-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wi-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wi-tooltip { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wi-chip-pop { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
