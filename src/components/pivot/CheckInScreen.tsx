import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { CheckIn, useApp } from "@/context/AppContext";
import { defaultWorkout } from "@/lib/mockData";

type NumericKey = "sleep" | "energy" | "soreness" | "time";
type Selections = Partial<Record<NumericKey, number>>;

const TOTAL_QUESTIONS = 5;
const MIN_LOAD_MS = 3000;

const LOADING_STAGES = [
  "Analyzing your readiness...",
  "Adjusting intensity...",
  "Building your workout structure...",
  "Optimizing for your time window...",
  "Almost ready...",
];

const QUESTIONS: {
  key: NumericKey;
  label: string;
  info: string;
  chips: { label: string; value: number; aria: string }[];
}[] = [
  {
    key: "sleep",
    label: "How much did you sleep last night?",
    info: "Sleep is the biggest driver of workout quality",
    chips: [
      { label: "< 5 hrs", value: 4, aria: "Sleep: less than 5 hours" },
      { label: "5-6 hrs", value: 5.5, aria: "Sleep: 5 to 6 hours" },
      { label: "7-8 hrs", value: 7.5, aria: "Sleep: 7 to 8 hours" },
      { label: "9+ hrs", value: 9.5, aria: "Sleep: 9 or more hours" },
    ],
  },
  {
    key: "energy",
    label: "How's your energy today?",
    info: "Your mental readiness - affected by stress, sleep, and mood",
    chips: [
      { label: "Exhausted", value: 2, aria: "Energy: exhausted" },
      { label: "Low", value: 4, aria: "Energy: low" },
      { label: "Good", value: 7, aria: "Energy: good" },
      { label: "Energised", value: 9, aria: "Energy: energised" },
    ],
  },
  {
    key: "soreness",
    label: "How does your body feel?",
    info: "How your muscles feel physically - distinct from mental energy",
    chips: [
      { label: "Stiff or achy", value: 9, aria: "Recovery: stiff or achy" },
      { label: "Sore", value: 6, aria: "Recovery: sore" },
      { label: "A little tight", value: 3, aria: "Recovery: a little tight" },
      { label: "Fresh", value: 1, aria: "Recovery: fresh" },
    ],
  },
  {
    key: "time",
    label: "How much time do you have?",
    info: "We'll fit the workout to your window",
    chips: [
      { label: "< 20 min", value: 15, aria: "Time: less than 20 minutes" },
      { label: "30 min", value: 30, aria: "Time: 30 minutes" },
      { label: "45 min", value: 45, aria: "Time: 45 minutes" },
      { label: "60+ min", value: 65, aria: "Time: 60 or more minutes" },
    ],
  },
];

const FOCUS_CHIPS = ["Push", "Pull", "Legs", "Full Body"] as const;
const FOCUS_INFO =
  "Push: chest/shoulders/triceps. Pull: back/biceps. Legs: lower body. Full Body: everything.";

function chipStyle(selected: boolean, animating: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
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
    animation: animating ? "chip-pop 200ms ease-out" : undefined,
  };
}

export function CheckInScreen({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const { generateWorkout, setTodayWorkout, incrementCheckInCount } = useApp();
  const [selections, setSelections] = useState<Selections>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<NumericKey | "focus" | null>(null);
  const [chipAnim, setChipAnim] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.keys(selections).length + (focus ? 1 : 0);
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

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

  const selectNumeric = (key: NumericKey, value: number, label: string) => {
    setSelections((s) => ({ ...s, [key]: value }));
    if (activeTooltip === key) setActiveTooltip(null);
    animateChip(`${key}-${label}`);
  };

  const selectFocus = (value: string) => {
    setFocus(value);
    if (activeTooltip === "focus") setActiveTooltip(null);
    animateChip(`focus-${value}`);
  };

  const submit = async () => {
    if (!allAnswered || loading) return;
    setLoading(true);
    setError(null);
    const startedAt = Date.now();

    const checkIn: CheckIn = {
      sleep: selections.sleep!,
      energy: selections.energy!,
      soreness: selections.soreness!,
      time: selections.time!,
      focus: focus ?? undefined,
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
      <div className="absolute inset-0 flex flex-col bg-background overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)", animation: "cin-enter 280ms ease-out both" }}>
        <div className="flex items-center px-5 shrink-0" style={{ height: 60 }}>
          <button onClick={onBack} aria-label="Go back" className="size-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors shrink-0">
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="flex-1 text-center" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
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
            animation: "cin-bg-pulse 3s ease-in-out infinite",
          }}
        />
        <p key={stage} className="px-8 text-center" style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.92)", animation: "cin-stage 300ms ease-out both" }}>
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
          @keyframes cin-stage { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes cin-bg-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", animation: "cin-enter 280ms ease-out both" }}
      onClick={() => setActiveTooltip(null)}
    >
      <div className="flex items-center px-5 shrink-0" style={{ height: 60 }}>
        <button onClick={onBack} aria-label="Go back" className="size-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors shrink-0">
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="flex-1 text-center" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
          Today's Readiness
        </h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 flex flex-col px-5 overflow-hidden" style={{ gap: 10, paddingTop: 10 }}>
        {QUESTIONS.map((q, i) => (
          <QuestionModule
            key={q.key}
            index={i}
            label={q.label}
            info={q.info}
            tooltipOpen={activeTooltip === q.key}
            onToggleInfo={(e) => {
              e.stopPropagation();
              setActiveTooltip((t) => (t === q.key ? null : q.key));
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {q.chips.map((chip) => {
                const selected = selections[q.key] === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    aria-pressed={selected}
                    aria-label={chip.aria}
                    className="pivot-checkin-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectNumeric(q.key, chip.value, chip.label);
                    }}
                    style={chipStyle(selected, !!chipAnim[`${q.key}-${chip.label}`])}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </QuestionModule>
        ))}

        <QuestionModule
          index={4}
          label="What do you want to train?"
          info={FOCUS_INFO}
          tooltipOpen={activeTooltip === "focus"}
          onToggleInfo={(e) => {
            e.stopPropagation();
            setActiveTooltip((t) => (t === "focus" ? null : "focus"));
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
            {FOCUS_CHIPS.map((chip) => {
              const selected = focus === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Training focus: ${chip}`}
                  className="pivot-checkin-chip"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectFocus(chip);
                  }}
                  style={{ ...chipStyle(selected, !!chipAnim[`focus-${chip}`]), fontSize: chip === "Full Body" ? 11 : 12, padding: "0 4px" }}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </QuestionModule>
      </div>

      <div className="px-4 shrink-0" style={{ paddingTop: 10, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered}
          aria-live="polite"
          className="relative w-full flex items-center justify-center font-bold active:scale-[0.97]"
          style={{
            height: 52,
            borderRadius: 26,
            fontSize: 15,
            background: allAnswered ? "#C7F73D" : answeredCount === 0 ? "rgba(199,247,61,0.25)" : "rgba(199,247,61,0.40)",
            color: allAnswered ? "#000" : answeredCount === 0 ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.60)",
            border: "none",
            cursor: allAnswered ? "pointer" : "default",
            transition: "background 200ms ease-out, color 200ms ease-out, transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {allAnswered ? "Generate Workout" : answeredCount === 0 ? "Answer all 5 to continue" : `${answeredCount} of 5 answered`}
          {allAnswered && <ArrowRight size={18} style={{ position: "absolute", right: 16 }} />}
        </button>
      </div>

      <style>{`
        .pivot-checkin-chip:active { transform: scale(0.96); transition: transform 120ms ease-out !important; }
        @keyframes cin-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cin-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cin-tooltip { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chip-pop { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

function QuestionModule({
  index,
  label,
  info,
  tooltipOpen,
  onToggleInfo,
  children,
}: {
  index: number;
  label: string;
  info: string;
  tooltipOpen: boolean;
  onToggleInfo: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="shrink-0" style={{ animation: `cin-rise 280ms ${index * 50}ms ease-out both` }}>
      <div className="flex items-center mb-1.5" style={{ gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground)/0.82)", lineHeight: 1.2 }}>
          {label}
        </span>
        <button
          type="button"
          onClick={onToggleInfo}
          aria-label={`More info about ${label}`}
          className="shrink-0 flex items-center justify-center"
          style={{ width: 18, height: 18 }}
        >
          <Info size={14} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>
      {tooltipOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 rounded-xl px-3 py-2"
          style={{
            background: "hsl(var(--surface-elevated))",
            border: "1px solid hsl(var(--foreground)/0.08)",
            fontSize: 12,
            lineHeight: 1.4,
            color: "hsl(var(--foreground)/0.70)",
            maxWidth: 240,
            animation: "cin-tooltip 150ms ease-out both",
          }}
        >
          {info}
        </div>
      )}
      {children}
    </div>
  );
}
