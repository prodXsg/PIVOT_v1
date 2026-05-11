import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { defaultWorkout } from "@/lib/mockData";

export type Readiness = { sleep: number; energy: number; soreness: number; time: number };

const QUICK_PICKS = [
  { id: "Push",      label: "Push",      desc: "Chest · Shoulders · Triceps" },
  { id: "Pull",      label: "Pull",      desc: "Back · Biceps · Rear Delts" },
  { id: "Legs",      label: "Legs",      desc: "Quads · Hamstrings · Glutes" },
  { id: "Full Body", label: "Full Body", desc: "All major groups" },
];

const SPECIFIC_MUSCLES = [
  { id: "Chest",     label: "Chest" },
  { id: "Back",      label: "Back" },
  { id: "Shoulders", label: "Shoulders" },
  { id: "Biceps",    label: "Biceps" },
  { id: "Triceps",   label: "Triceps" },
  { id: "Glutes",    label: "Glutes" },
  { id: "Hamstrings",label: "Hamstrings" },
  { id: "Quads",     label: "Quads" },
  { id: "Calves",    label: "Calves" },
  { id: "Core",      label: "Core" },
  { id: "Arms",      label: "Arms" },
  { id: "Rear Delts",label: "Rear Delts" },
];

const CONFIRMATIONS: Record<string, string> = {
  Push:        "Chest, shoulders, and triceps.",
  Pull:        "Back, biceps, and rear delts.",
  Legs:        "Quads, hamstrings, and glutes.",
  "Full Body": "All major muscle groups, balanced.",
  Chest:       "Chest as the primary focus.",
  Back:        "Lats and upper back.",
  Shoulders:   "All three delt heads.",
  Biceps:      "Biceps isolation session.",
  Triceps:     "Triceps isolation session.",
  Glutes:      "Glutes and hip extensors.",
  Hamstrings:  "Hamstrings and posterior chain.",
  Quads:       "Quad-dominant session.",
  Calves:      "Calf work today.",
  Core:        "Abs, obliques, and stability.",
  Arms:        "Biceps and triceps, balanced.",
  "Rear Delts":"Posterior deltoid and upper back.",
};

const LOADING_STAGES = [
  "Analyzing your readiness...",
  "Matching to your focus...",
  "Building workout structure...",
  "Optimizing for your window...",
  "Almost ready...",
];

export function TrainingFocusScreen({
  readiness,
  onBack,
  onComplete,
}: {
  readiness: Readiness;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { generateWorkout, setTodayWorkout, incrementCheckInCount } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [layer, setLayer] = useState<"quick" | "specific" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loading) return;
    setLoadingStage(0);
    const interval = setInterval(() => {
      setLoadingStage((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 1400);
    return () => clearInterval(interval);
  }, [loading]);

  const selectQuick = (id: string) => {
    setSelected(id);
    setLayer("quick");
  };

  const selectSpecific = (id: string) => {
    setSelected(id);
    setLayer("specific");
  };

  const submit = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError(false);
    const MIN_LOAD_MS = 6000;
    const startTime = Date.now();

    try {
      const w = await generateWorkout({ ...readiness, focus: selected });
      if (!w?.exercises?.length) {
        setLoading(false);
        setError(true);
        return;
      }
      setTodayWorkout(w);
      incrementCheckInCount();
      const elapsed = Date.now() - startTime;
      setTimeout(() => onComplete(), Math.max(0, MIN_LOAD_MS - elapsed));
    } catch {
      setLoading(false);
      setError(true);
    }
  };

  if (loading) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A]"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="absolute top-0 left-0 right-0 flex justify-center"
          style={{ paddingTop: "max(52px, calc(env(safe-area-inset-top) + 20px))" }}
        >
          <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: "6px", color: "rgba(255,255,255,0.9)" }}>
            PIVOT
          </p>
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(199,247,61,0.04) 0%, transparent 65%)",
            animation: "tf-bg-pulse 3s ease-in-out infinite",
          }}
        />

        <div key={loadingStage} className="px-8 text-center" style={{ animation: "tf-stage 300ms ease-out both" }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.9)", lineHeight: 1.4 }}>
            {LOADING_STAGES[loadingStage]}
          </p>
        </div>

        <div className="flex gap-1.5 mt-5">
          {LOADING_STAGES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === loadingStage ? 20 : 6,
                height: 6,
                borderRadius: 999,
                background: i === loadingStage ? "#C7F73D" : "rgba(255,255,255,0.18)",
                transition: "width 300ms ease-out, background 300ms ease-out",
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes tf-stage {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes tf-bg-pulse {
            0%, 100% { opacity: 0.6; }
            50%       { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", animation: "tf-enter 280ms ease-out both" }}
    >
      {/* Header — back + centered progress dots */}
      <div className="flex items-center px-5 shrink-0" style={{ height: 60 }}>
        <button
          onClick={onBack}
          aria-label="Go back"
          className="size-9 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(199,247,61,0.50)" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C7F73D" }} />
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Progress bar — full since step 2 */}
      <div style={{ height: 2, background: "hsl(var(--foreground)/0.06)", flexShrink: 0 }}>
        <div style={{ height: "100%", width: "100%", background: "#C7F73D" }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 overflow-y-auto" style={{ paddingTop: 20 }}>
        <div style={{ animation: "tf-rise 280ms ease-out both" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px", color: "hsl(var(--foreground))", lineHeight: 1.2 }}>
            What do you want to train?
          </h1>
          <p style={{ marginTop: 6, fontSize: 13, color: "hsl(var(--foreground)/0.50)", lineHeight: 1.5, fontStyle: "italic" }}>
            Your workout builds around your answer.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive shrink-0">
            Couldn't generate your workout. Try again.
          </div>
        )}

        {/* Layer 1 — Quick Pick */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "hsl(var(--foreground)/0.35)", marginBottom: 10 }}>
            Quick select
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
            {QUICK_PICKS.map((f, i) => {
              const isSelected = selected === f.id && layer === "quick";
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectQuick(f.id)}
                  style={{
                    borderRadius: 14,
                    padding: "12px 6px",
                    textAlign: "center",
                    background: isSelected ? "rgba(199,247,61,0.10)" : "hsl(var(--card))",
                    border: isSelected ? "1.5px solid rgba(199,247,61,0.50)" : "1px solid hsl(var(--border))",
                    cursor: "pointer",
                    transition: "background 150ms ease-out, border-color 150ms ease-out",
                    animation: `tf-rise 280ms ${i * 40}ms ease-out both`,
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#C7F73D" : "hsl(var(--foreground))", lineHeight: 1.2, transition: "color 150ms ease-out" }}>
                    {f.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer 2 — Specific Muscles */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "hsl(var(--foreground)/0.35)", marginBottom: 10 }}>
            Or go specific
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {SPECIFIC_MUSCLES.map((m, i) => {
              const isSelected = selected === m.id && layer === "specific";
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectSpecific(m.id)}
                  style={{
                    borderRadius: 12,
                    padding: "10px 8px",
                    textAlign: "center",
                    background: isSelected ? "rgba(199,247,61,0.10)" : "hsl(var(--card))",
                    border: isSelected ? "1.5px solid rgba(199,247,61,0.50)" : "1px solid hsl(var(--border))",
                    cursor: "pointer",
                    transition: "background 150ms ease-out, border-color 150ms ease-out",
                    animation: `tf-rise 280ms ${(i + 4) * 30}ms ease-out both`,
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "#C7F73D" : "hsl(var(--foreground)/0.75)", lineHeight: 1.2, transition: "color 150ms ease-out" }}>
                    {m.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coaching confirmation */}
        {selected && CONFIRMATIONS[selected] && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(199,247,61,0.06)",
              border: "1px solid rgba(199,247,61,0.15)",
              animation: "tf-rise 200ms ease-out both",
            }}
          >
            <p style={{ fontSize: 13, color: "rgba(199,247,61,0.80)", fontStyle: "italic" }}>
              {CONFIRMATIONS[selected]}
            </p>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 24 }} />
      </div>

      {/* CTA */}
      <div
        className="px-4 shrink-0"
        style={{ paddingTop: 16, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={!selected}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 26,
            background: selected ? "#C7F73D" : "rgba(199,247,61,0.20)",
            border: "none",
            fontSize: 15,
            fontWeight: selected ? 700 : 500,
            color: selected ? "#000000" : "rgba(0,0,0,0.35)",
            cursor: selected ? "pointer" : "default",
            transition: "background 200ms ease-out, color 200ms ease-out",
          }}
        >
          Generate My Workout
        </button>
      </div>

      <style>{`
        @keyframes tf-enter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tf-rise {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
