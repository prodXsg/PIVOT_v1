import { useEffect, useState } from "react";
import { ChevronLeft, ArrowRight, Lock } from "lucide-react";
import { weeklyInsight as fallback } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";

type Insight = typeof fallback;

const PAST_KEY = "pivot_weekly_summaries_v1";
const CHECKIN_THRESHOLD = 3;
const WEEKS_TO_RECOVERY = 2;
const WEEKS_TO_PERFORMANCE = 4;

function getWeekRange(): string {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function loadPast(): Insight[] {
  try { return JSON.parse(localStorage.getItem(PAST_KEY) ?? "[]"); }
  catch { return []; }
}

function saveSummary(insight: Insight) {
  try {
    const existing = loadPast();
    if (!existing.some((s) => s.range === insight.range)) {
      localStorage.setItem(PAST_KEY, JSON.stringify([insight, ...existing].slice(0, 12)));
    }
  } catch {}
}

function getWeeksTraining(): number {
  try {
    const date = localStorage.getItem("pivot_last_checkin_date");
    if (!date) return 0;
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    return Math.floor(days / 7);
  } catch { return 0; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ZeroCheckInCard({ onStartCheckIn }: { onStartCheckIn?: () => void }) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 text-center"
      style={{ animation: "ins-rise 320ms ease-out both" }}
    >
      <div style={{ fontSize: 48, lineHeight: 1 }}>🧠</div>
      <h2 className="mt-4 text-[20px] font-bold tracking-tight">Building your profile</h2>
      <p className="mt-2 text-sm text-foreground/55 leading-relaxed max-w-[240px] mx-auto">
        Complete your first check-in to start your readiness tracking.
      </p>
      {onStartCheckIn && (
        <button
          onClick={onStartCheckIn}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
        >
          Start check-in <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function EarlyInsightsCard({ checkInCount }: { checkInCount: number }) {
  const remaining = CHECKIN_THRESHOLD - checkInCount;
  const progress = Math.min(checkInCount / CHECKIN_THRESHOLD, 1);

  const getObservation = () => {
    return checkInCount === 1
      ? `${checkInCount} check-in completed this week. Consistency builds better insights over time.`
      : `${checkInCount} check-ins completed this week. Keep going — one more unlocks your first full summary.`;
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-6"
      style={{ animation: "ins-rise 320ms ease-out both" }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "hsl(var(--foreground)/0.38)", lineHeight: 1 }}>
        Early Insights
      </p>
      <h2 className="mt-3" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", color: "hsl(var(--foreground))", lineHeight: 1.2 }}>
        {checkInCount === 1 ? "Good start" : "Building momentum"}
      </h2>
      <p className="mt-2" style={{ fontSize: 14, lineHeight: 1.55, color: "hsl(var(--foreground)/0.55)" }}>
        {getObservation()}
      </p>
      <div className="mt-5 rounded-full overflow-hidden" style={{ height: 6, background: "hsl(var(--foreground)/0.08)" }}>
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress * 100}%`, transition: "width 600ms ease-out" }}
        />
      </div>
      <p className="mt-2 text-xs text-foreground/40">
        {remaining} more check-in{remaining !== 1 ? "s" : ""} to unlock full insights
      </p>
    </div>
  );
}

function LockedCard({
  icon,
  title,
  body,
  unlockLabel,
  weeksNeeded,
  currentWeeks,
  delay = 0,
}: {
  icon: string;
  title: string;
  body: string;
  unlockLabel: string;
  weeksNeeded: number;
  currentWeeks: number;
  delay?: number;
}) {
  const progress = Math.min(currentWeeks / weeksNeeded, 1);

  return (
    <div
      className="bg-elevated border border-border rounded-2xl p-4 relative overflow-hidden"
      style={{ animation: `ins-rise 320ms ${delay}ms ease-out both` }}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "55%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
            animation: "ins-shimmer 2.8s ease-in-out infinite",
          }}
        />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 16 }}>{icon}</span>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "hsl(var(--foreground)/0.28)", lineHeight: 1 }}>
          {title}
        </p>
      </div>

      <p style={{ fontSize: 12, lineHeight: 1.5, color: "hsl(var(--foreground)/0.40)" }}>
        {body}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        <Lock size={10} strokeWidth={2} style={{ color: "hsl(var(--foreground)/0.25)" }} />
        <p style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--foreground)/0.30)" }}>
          {unlockLabel}
        </p>
      </div>

      <div className="mt-2 rounded-full overflow-hidden" style={{ height: 3, background: "hsl(var(--foreground)/0.06)" }}>
        <div
          className="h-full rounded-full bg-primary/40"
          style={{ width: `${progress * 100}%`, transition: "width 600ms ease-out" }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InsightsScreen() {
  const { checkInCount, setTab, weeklyCompletedWorkouts, totalTrainingTime, totalPivotCount } = useApp();
  const isNewUser = checkInCount < CHECKIN_THRESHOLD;
  const weeksTraining = getWeeksTraining();

  const [data, setData] = useState<Insight>(fallback);
  const [loading, setLoading] = useState(!isNewUser);
  const [showPast, setShowPast] = useState(false);
  const [past, setPast] = useState<Insight[]>(() => loadPast());

  useEffect(() => {
    if (isNewUser) return;

    let cancelled = false;
    (async () => {
      try {
        const weekData = {
          range: getWeekRange(),
          workoutsPlanned: 4,
          workoutsCompleted: weeklyCompletedWorkouts,
          totalMinutes: Math.round(totalTrainingTime),
          avgSleepHours: 7.0,
          pivotsTaken: totalPivotCount,
          notes: "",
        };
        const { data: res, error } = await supabase.functions.invoke(
          "generate-weekly-summary",
          { body: weekData }
        );
        if (error) throw error;
        if (!cancelled && res) {
          const insight = { ...res, range: weekData.range } as Insight;
          setData(insight);
          saveSummary(insight);
          setPast(loadPast());
        }
      } catch {
        // Falls back to fallback data silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNewUser]);

  // ── Past summaries view ──
  if (showPast) {
    return (
      <div className="flex-1 flex flex-col bg-background animate-fade-in">
        <div className="sticky top-0 z-20 h-14 flex items-center justify-center bg-background/90 backdrop-blur-xl border-b border-[hsl(var(--foreground)/0.06)]">
          <button
            onClick={() => setShowPast(false)}
            aria-label="Back"
            className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 className="text-[17px] font-semibold">Past Summaries</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
          {past.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-medium text-foreground/70">No past summaries yet.</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                After your first full week of training, a summary will be saved here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {past.map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-card">
                  <p className="text-[12px] uppercase tracking-wider font-semibold text-foreground/40 mb-3">{s.range}</p>
                  <p className="text-[15px] italic leading-relaxed text-foreground/90 mb-4">"{s.summary}"</p>
                  <div className="grid grid-cols-2 gap-2">
                    {s.stats.map((st) => (
                      <div key={st.label} className="bg-elevated border border-border rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-tertiary leading-tight">{st.label}</p>
                        <p className="mt-1 text-lg font-bold tabular tracking-tight">{st.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main insights view ──
  return (
    <div className="flex-1 flex flex-col px-5 pt-12 pb-6 overflow-y-auto animate-fade-in">
      <header className="mb-6" style={{ animation: "ins-rise 280ms ease-out both" }}>
        <p className="text-sm text-tertiary uppercase tracking-[0.18em] font-medium">Insights</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">This week</h1>
      </header>

      {checkInCount === 0 ? (
        <ZeroCheckInCard onStartCheckIn={() => setTab("home")} />
      ) : isNewUser ? (
        <EarlyInsightsCard checkInCount={checkInCount} />
      ) : (
        <>
          {/* Weekly summary card */}
          <div
            className="relative bg-card border border-border rounded-2xl p-6 shadow-card overflow-hidden"
            style={{ animation: "ins-rise 280ms 40ms ease-out both" }}
          >
            <div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            {loading ? (
              <div className="space-y-2">
                <div className="h-3 bg-secondary rounded animate-soft-pulse" />
                <div className="h-3 bg-secondary rounded animate-soft-pulse w-5/6" />
                <div className="h-3 bg-secondary rounded animate-soft-pulse w-4/6" />
              </div>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground/40 mb-3">{data.range}</p>
                <p className="text-[15px] italic leading-relaxed text-foreground/95">"{data.summary}"</p>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-2 gap-3" style={{ animation: "ins-rise 280ms 80ms ease-out both" }}>
            {data.stats.map((s) => (
              <div key={s.label} className="bg-elevated border border-border rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-tertiary leading-tight">{s.label}</p>
                {loading ? (
                  <div className="mt-2 h-7 w-16 bg-secondary rounded animate-soft-pulse" />
                ) : (
                  <p className="mt-2 text-2xl font-bold tabular tracking-tight">{s.value}</p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowPast(true)}
            className="mt-6 self-start inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2 transition-all"
            style={{ animation: "ins-rise 280ms 120ms ease-out both" }}
          >
            View past summaries <ArrowRight size={14} />
          </button>
        </>
      )}

      {/* Progressive unlock cards — always visible */}
      <div className="mt-6 grid grid-cols-2 gap-3" aria-label="Upcoming features">
        <LockedCard
          icon="🔒"
          title="Recovery Patterns"
          body="Tracks how your body responds to training load over time"
          unlockLabel="Unlocks at 2 weeks"
          weeksNeeded={WEEKS_TO_RECOVERY}
          currentWeeks={weeksTraining}
          delay={isNewUser ? 80 : 160}
        />
        <LockedCard
          icon="🔒"
          title="Performance Trends"
          body="Shows strength and endurance progression across sessions"
          unlockLabel="Unlocks at 4 weeks"
          weeksNeeded={WEEKS_TO_PERFORMANCE}
          currentWeeks={weeksTraining}
          delay={isNewUser ? 120 : 200}
        />
      </div>

      <style>{`
        @keyframes ins-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ins-shimmer {
          0%   { transform: translateX(-160%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
