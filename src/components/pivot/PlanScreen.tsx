import { useEffect, useRef, useState } from "react";
import { Check, Circle, ChevronLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { Exercise } from "@/lib/mockData";
import { PivotModal } from "./PivotModal";
import { ExerciseImage } from "./ExerciseImage";
import { toast } from "sonner";

type DayCard = {
  key: string;
  dayName: string;
  dateLabel: string;
  focus: string;
  status: "today" | "future" | "past";
  exercises: { name: string; setsReps: string; cue?: string }[];
  isCheckedIn?: boolean;
};

const FOCUSES = ["Upper Push", "Lower", "Upper Pull", "Conditioning", "Rest / Mobility"];

function buildPlan(): DayCard[] {
  const out: DayCard[] = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
    const dateLabel = `${dayName} ${d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}`;
    out.push({
      key: d.toISOString().slice(0, 10),
      dayName,
      dateLabel,
      focus: FOCUSES[i % FOCUSES.length],
      status: i === 0 ? "today" : "future",
      exercises: [
        { name: "Barbell Bench Press", setsReps: "4 sets · 6 reps", cue: "Brace, drive feet through floor." },
        { name: "Incline DB Press", setsReps: "3 sets · 10 reps" },
        { name: "Cable Lateral Raise", setsReps: "3 sets · 12-15 reps" },
        { name: "Triceps Pushdown", setsReps: "3 sets · 12 reps" },
      ],
    });
  }
  return out;
}

function getCheckedInToday(): boolean {
  try {
    const v = localStorage.getItem("pivot_last_checkin_date");
    return v === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

function deriveAdaptiveContext(focus: string, rationale: string): string {
  const f = focus.toLowerCase();
  const r = rationale.toLowerCase();
  if (f.includes("deload") || f.includes("re-entry")) return "Deload session";
  if (r.includes("low energy") || r.includes("adapted") || r.includes("reduced")) return "Adapted: low energy";
  return "Full intensity";
}

export function PlanScreen() {
  const { todayWorkout, hasGeneratedWorkout, completedWorkoutsCount, swapExercise, pivotExercise } = useApp();
  const [days] = useState<DayCard[]>(() => buildPlan());
  const [checkedIn, setCheckedIn] = useState<boolean>(() => getCheckedInToday());
  const [preview, setPreview] = useState<DayCard | null>(null);
  const [pivotTarget, setPivotTarget] = useState<Exercise | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);

  useEffect(() => {
    const refresh = () => setCheckedIn(getCheckedInToday());
    window.addEventListener("pivot:checkin-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("pivot:checkin-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Restore scroll on return from preview
  useEffect(() => {
    if (!preview && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollPosRef.current;
    }
  }, [preview]);

  const openPreview = (day: DayCard) => {
    if (scrollRef.current) scrollPosRef.current = scrollRef.current.scrollLeft;
    setPreview(day);
  };

  const handlePivot = async (constraint: string) => {
    if (!pivotTarget) return;
    const target = pivotTarget;
    setPivotTarget(null);
    try {
      const alt = await swapExercise(target.id, constraint);
      pivotExercise(target.id, alt);
      setTimeout(() => {
        toast(`Swapped to ${alt.name}`, { description: alt.rationale });
      }, 200);
    } catch {
      toast.error("Couldn't swap that exercise. Try again.");
    }
  };

  if (preview) {
    const isToday = preview.status === "today";
    const hasTodayWorkout = isToday && checkedIn && !!todayWorkout?.exercises?.length;
    const exercises = hasTodayWorkout
      ? todayWorkout!.exercises
      : preview.exercises.map((e) => ({ ...e, id: e.name, pivoted: false, pivotRationale: undefined }));
    const adaptiveContext = hasTodayWorkout
      ? deriveAdaptiveContext(todayWorkout!.focus, todayWorkout!.rationale)
      : null;

    return (
      <div className="flex-1 flex flex-col bg-background animate-fade-in">
        <div className="sticky top-0 z-20 h-14 flex items-center justify-center bg-background/90 backdrop-blur-xl border-b border-[hsl(var(--foreground)/0.06)]">
          <button
            onClick={() => setPreview(null)}
            aria-label="Back to plan"
            className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 className="text-[17px] font-semibold">{preview.dateLabel}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
          <p className="text-[12px] uppercase tracking-[1px] text-foreground/40 font-semibold">
            {isToday ? (checkedIn ? "TODAY" : "TODAY · PROVISIONAL") : preview.status === "future" ? "PROVISIONAL" : "COMPLETED"}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold">{hasTodayWorkout ? todayWorkout!.focus : preview.focus}</h2>
            {adaptiveContext && (
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                adaptiveContext === "Deload session"
                  ? "bg-blue-500/15 text-blue-400"
                  : adaptiveContext.startsWith("Adapted")
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-primary/15 text-primary"
              )}>
                {adaptiveContext}
              </span>
            )}
          </div>
          {preview.status === "future" && (
            <p className="mt-2 text-sm text-foreground/55">Subject to your daily check-in.</p>
          )}

          <ul className="mt-6 space-y-2">
            {exercises.map((ex, i) => (
              <li
                key={i}
                className={cn(
                  "bg-elevated border border-[hsl(var(--foreground)/0.06)] rounded-2xl p-4",
                  "pivoted" in ex && ex.pivoted && "ring-1 ring-primary/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <ExerciseImage name={ex.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold">{ex.name}</p>
                      {"pivoted" in ex && ex.pivoted && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground bg-primary px-1.5 py-0.5 rounded animate-badge-pop">
                          Pivoted
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/60 tabular">{ex.setsReps}</p>
                    {ex.cue && <p className="mt-1 text-xs text-foreground/50 italic">{ex.cue}</p>}
                  </div>
                  {hasTodayWorkout && "id" in ex && (
                    <button
                      onClick={() => setPivotTarget(ex as Exercise)}
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground bg-secondary hover:bg-card border border-border rounded-full px-3 py-2 transition-colors"
                    >
                      <RefreshCw size={12} strokeWidth={2.4} /> Pivot
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <PivotModal
          open={!!pivotTarget}
          exerciseName={pivotTarget?.name ?? ""}
          onClose={() => setPivotTarget(null)}
          onSubmit={handlePivot}
        />
      </div>
    );
  }

  if (completedWorkoutsCount === 0 && !hasGeneratedWorkout) {
    return (
      <div className="flex-1 flex flex-col animate-fade-in">
        <div className="h-14 flex items-center px-5 mt-4">
          <h1 className="text-[17px] font-semibold tracking-tight">Plan</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 pb-16">
          <div style={{ fontSize: 48, lineHeight: 1 }}>📋</div>
          <p className="mt-4 text-base font-semibold text-foreground/80">Your plan builds as you train.</p>
          <p className="mt-2 text-sm text-foreground/50 leading-relaxed max-w-[260px]">
            Complete your first check-in to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      <div className="h-14 flex items-center px-5 mt-4">
        <h1 className="text-[17px] font-semibold tracking-tight">Plan</h1>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <ul className="flex gap-3 px-5">
          {days.map((d, idx) => {
            const isToday = d.status === "today";
            const showProvisional = d.status === "future" || (isToday && !checkedIn);
            return (
              <li
                key={d.key}
                style={{
                  scrollSnapAlign: "start",
                  width: isToday ? 220 : 200,
                  animation: `plan-rise 300ms ${idx * 60}ms ease-out both`,
                }}
                className="shrink-0"
              >
                <button
                  onClick={() => openPreview(d)}
                  aria-label={`${d.dateLabel}, ${d.focus}, ${showProvisional ? "provisional plan" : "today"}, tap to preview`}
                  className={cn(
                    "w-full text-left rounded-2xl border p-4 flex flex-col gap-3 transition-transform duration-150 active:scale-[0.98]",
                    isToday
                      ? "bg-card border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_4px_16px_hsl(var(--primary)/0.08)]"
                      : "bg-elevated border-[hsl(var(--foreground)/0.06)]"
                  )}
                  style={{ minHeight: isToday ? 170 : 150 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={cn(
                          "text-[11px] uppercase tracking-wider font-semibold",
                          isToday ? "text-primary" : "text-foreground/40"
                        )}
                      >
                        {idx === 0 ? "Today" : d.dayName}
                      </p>
                      <p className="text-base font-bold tabular mt-0.5 text-foreground">
                        {d.dateLabel.split(" ").slice(1).join(" ")}
                      </p>
                    </div>
                    <StatusIcon status={d.status} pulseOnce={isToday && !checkedIn} />
                  </div>
                  <div>
                    <p className={cn("text-base font-semibold leading-tight", isToday && "text-foreground")}>
                      {isToday && checkedIn && todayWorkout ? todayWorkout.focus : d.focus}
                    </p>
                    {isToday && checkedIn && todayWorkout ? (
                      <span className={cn(
                        "mt-2 inline-block text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                        deriveAdaptiveContext(todayWorkout.focus, todayWorkout.rationale) === "Deload session"
                          ? "text-blue-400 bg-blue-500/15"
                          : deriveAdaptiveContext(todayWorkout.focus, todayWorkout.rationale).startsWith("Adapted")
                          ? "text-amber-400 bg-amber-500/15"
                          : "text-primary bg-primary/15"
                      )}>
                        {deriveAdaptiveContext(todayWorkout.focus, todayWorkout.rationale)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "mt-2 inline-block text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                          isToday
                            ? "text-primary bg-primary/15"
                            : showProvisional
                            ? "text-foreground/45 bg-foreground/[0.06]"
                            : "text-foreground/55 bg-foreground/[0.06]"
                        )}
                      >
                        {isToday ? "TODAY" : "PROVISIONAL"}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p
        className="px-5 mt-4 text-sm text-foreground/55"
        style={{ animation: "plan-rise 300ms 360ms ease-out both" }}
      >
        Provisional — adjusts every morning based on your check-in.
      </p>

      <style>{`
        @keyframes plan-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes plan-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatusIcon({ status, pulseOnce }: { status: "today" | "future" | "past"; pulseOnce?: boolean }) {
  if (status === "past") {
    return (
      <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center">
        <Check size={14} strokeWidth={3} />
      </div>
    );
  }
  if (status === "today") {
    return (
      <span
        className="inline-block size-2.5 rounded-full bg-primary"
        style={pulseOnce ? { animation: "plan-pulse 700ms ease-out 1" } : undefined}
      />
    );
  }
  return <Circle size={18} className="text-foreground/30" strokeWidth={1.6} />;
}
