import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PREFS_KEY = "pivot_prefs_v1";

type Prefs = { notifications: boolean };
type LegalPage = "privacy" | "tos";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { notifications: false, ...JSON.parse(raw) };
  } catch {}
  return { notifications: false };
}

function savePrefs(p: Prefs): boolean {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ProfileScreen({ onBack }: { onBack?: () => void }) {
  const {
    theme,
    toggleTheme,
    userProfile,
    setUserProfile,
    completedWorkoutsCount,
    totalTrainingTime,
    weeklyCompletedWorkouts,
    totalPivotCount,
  } = useApp();

  const rawName = userProfile?.name?.trim() || "";
  const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "";
  const displayEmail = userProfile?.email?.trim() || "";
  const avatarInitial = displayName ? displayName[0].toUpperCase() : "?";

  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [legalOpen, setLegalOpen] = useState<LegalPage | null>(null);
  const [confirmAction, setConfirmAction] = useState<"logout" | "delete" | null>(null);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameInput, setNameInput] = useState(rawName);
  const [emailInput, setEmailInput] = useState(displayEmail);

  useEffect(() => {
    const el = document.getElementById("profile-scroll");
    if (el) el.scrollTop = 0;
  }, []);

  const toggleNotifications = () => {
    const next = { ...prefs, notifications: !prefs.notifications };
    const prev = prefs;
    setPrefs(next);
    if (!savePrefs(next)) setPrefs(prev);
  };

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 1 || trimmed.length > 30) return;
    setUserProfile({ ...userProfile!, name: trimmed });
    setEditingName(false);
    toast("Name updated");
  };

  const saveEmail = () => {
    const trimmed = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setUserProfile({ ...userProfile!, email: trimmed });
    setEditingEmail(false);
    toast("Email updated");
  };

  const doLogout = () => {
    setConfirmAction(null);
    window.dispatchEvent(new Event("pivot:reset-app"));
  };

  const doDelete = () => {
    setConfirmAction(null);
    window.dispatchEvent(new Event("pivot:reset-app"));
    toast("Account deleted");
  };

  const stats = [
    { label: "Workouts", value: String(completedWorkoutsCount) },
    { label: "Training time", value: formatTime(totalTrainingTime) },
    { label: "This week", value: String(weeklyCompletedWorkouts) },
    { label: "Pivots", value: String(totalPivotCount) },
  ];

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-background">
      <div
        id="profile-scroll"
        className="absolute inset-0 flex flex-col overflow-y-auto bg-background animate-[profile-slide-in_250ms_ease-out]"
      >
        {/* Top bar */}
        <div className="sticky top-0 z-20 h-14 flex items-center justify-center bg-background/90 backdrop-blur-xl border-b border-[hsl(var(--foreground)/0.06)]">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full active:scale-95 transition-transform duration-150"
            >
              <ChevronLeft size={24} strokeWidth={2.2} className="text-foreground" />
            </button>
          )}
          <h1 className="text-[17px] font-semibold tracking-tight">Profile</h1>
        </div>

        {/* Avatar */}
        <div className="pt-8 pb-4 flex flex-col items-center px-5">
          <div
            className="size-[72px] rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "hsl(var(--foreground) / 0.08)",
              boxShadow: "inset 0 0 0 1px hsl(var(--foreground) / 0.14)",
            }}
          >
            <span className="text-[28px] font-semibold text-foreground/85">{avatarInitial}</span>
          </div>
          <p className="mt-4 text-[22px] font-bold tracking-tight">{displayName || "—"}</p>
          <p className="mt-1 text-sm text-foreground/55">{displayEmail || "No email set"}</p>
        </div>

        {/* Stats tiles */}
        <div className="px-4 mt-2">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <p style={{ fontSize: 22, fontWeight: 800, color: "hsl(var(--foreground))", lineHeight: 1.1 }}>
                  {s.value}
                </p>
                <p style={{ marginTop: 3, fontSize: 12, color: "hsl(var(--foreground)/0.45)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Profile — editable */}
        <Section title="PROFILE">
          {/* Name row */}
          <div
            className="w-full px-4 flex items-center justify-between"
            style={{ minHeight: 56, borderBottom: "1px solid hsl(var(--foreground) / 0.06)" }}
          >
            {editingName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={30}
                  style={{
                    flex: 1,
                    background: "hsl(var(--muted))",
                    border: "1.5px solid hsl(var(--foreground)/0.20)",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 14,
                    color: "hsl(var(--foreground))",
                    outline: "none",
                  }}
                />
                <button onClick={saveName} className="size-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button onClick={() => { setEditingName(false); setNameInput(rawName); }} className="size-8 flex items-center justify-center rounded-full bg-foreground/08 text-foreground/50">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">Name</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/55">{displayName || "—"}</span>
                  <button onClick={() => setEditingName(true)} className="size-7 flex items-center justify-center text-foreground/35 hover:text-foreground transition-colors">
                    <Pencil size={13} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Email row */}
          <div
            className="w-full px-4 flex items-center justify-between"
            style={{ minHeight: 56 }}
          >
            {editingEmail ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: "hsl(var(--muted))",
                    border: "1.5px solid hsl(var(--foreground)/0.20)",
                    borderRadius: 10,
                    padding: "6px 10px",
                    fontSize: 14,
                    color: "hsl(var(--foreground))",
                    outline: "none",
                  }}
                />
                <button onClick={saveEmail} className="size-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button onClick={() => { setEditingEmail(false); setEmailInput(displayEmail); }} className="size-8 flex items-center justify-center rounded-full bg-foreground/08 text-foreground/50">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">Email</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/55 truncate max-w-[160px]">{displayEmail || "—"}</span>
                  <button onClick={() => setEditingEmail(true)} className="size-7 flex items-center justify-center text-foreground/35 hover:text-foreground transition-colors">
                    <Pencil size={13} strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Preferences */}
        <Section title="PREFERENCES">
          <Row
            label="Notifications"
            control={
              <Toggle
                on={prefs.notifications}
                onToggle={toggleNotifications}
                ariaLabel="Toggle notifications"
              />
            }
          />
          <Row
            label="Theme"
            value={theme === "dark" ? "Dark" : "Light"}
            control={
              <Toggle
                on={theme === "dark"}
                onToggle={toggleTheme}
                ariaLabel="Toggle theme"
              />
            }
            last
          />
        </Section>

        {/* Account */}
        <Section title="ACCOUNT">
          {confirmAction === "logout" ? (
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--foreground) / 0.06)" }}>
              <span className="flex-1 text-sm text-foreground/70">Log out of Pivot?</span>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-foreground/55 border border-foreground/15 hover:bg-foreground/05 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="px-3 py-1.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Row label="Log Out" chevron onClick={() => setConfirmAction("logout")} />
          )}

          {confirmAction === "delete" ? (
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="flex-1 text-sm text-foreground/70">Delete account? This can't be undone.</span>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-foreground/55 border border-foreground/15 hover:bg-foreground/05 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="px-3 py-1.5 rounded-full text-sm font-semibold bg-destructive text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          ) : (
            <Row
              label="Delete Account"
              chevron
              onClick={() => setConfirmAction("delete")}
              last
              destructive
            />
          )}
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <Row label="Version" value="1.0.0" />
          <Row label="Privacy Policy" chevron onClick={() => setLegalOpen("privacy")} />
          <Row label="Terms of Service" chevron onClick={() => setLegalOpen("tos")} last />
        </Section>

        <div style={{ height: 48 }} />
      </div>

      {/* Legal overlay */}
      {legalOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background animate-fade-in overflow-hidden">
          <div className="sticky top-0 z-20 h-14 flex items-center justify-center bg-background/90 backdrop-blur-xl border-b border-[hsl(var(--foreground)/0.06)]">
            <button
              onClick={() => setLegalOpen(null)}
              aria-label="Back"
              className="absolute left-2 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-full active:scale-95 transition-transform duration-150"
            >
              <ChevronLeft size={24} strokeWidth={2.2} className="text-foreground" />
            </button>
            <h1 className="text-[17px] font-semibold tracking-tight">
              {legalOpen === "privacy" ? "Privacy Policy" : "Terms of Service"}
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-8">
            {legalOpen === "privacy" ? <PrivacyContent /> : <TosContent />}
          </div>
        </div>
      )}

      <style>{`
        @keyframes profile-slide-in {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  caption,
  embedded,
  children,
}: {
  title: string;
  caption?: string;
  embedded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={embedded ? "pt-4 pb-4" : "mt-8"}>
      <h2
        className="px-4 pb-2 text-[12px] font-semibold uppercase text-foreground/40"
        style={{ letterSpacing: "1px" }}
      >
        {title}
      </h2>
      {caption && <p className="px-4 pb-2 text-[12px] text-foreground/40">{caption}</p>}
      <div>{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  chevron,
  control,
  onClick,
  last,
  destructive,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  control?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
  destructive?: boolean;
}) {
  const style = {
    borderBottom: last ? "none" : "1px solid hsl(var(--foreground) / 0.06)",
  };

  const inner = (
    <>
      <span
        className={cn("text-sm font-medium", destructive ? "text-destructive" : "text-foreground")}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-foreground/55">{value}</span>}
        {control}
        {chevron && <ChevronRight size={18} className="text-foreground/35" />}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full h-14 px-4 flex items-center justify-between text-left active:bg-foreground/[0.04] transition-colors"
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="w-full h-14 px-4 flex items-center justify-between" style={style}>
      {inner}
    </div>
  );
}

function Toggle({
  on,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      className={cn(
        "relative w-[42px] h-[26px] rounded-full transition-colors duration-200",
        on ? "bg-primary" : "bg-foreground/15"
      )}
    >
      <span
        className="absolute top-[2px] left-[2px] size-[22px] rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5 text-sm text-foreground/75 leading-relaxed">
      <p className="font-semibold text-foreground">Last updated: May 2026</p>
      <p>
        Pivot collects only what it needs to generate your workouts: your daily check-in responses
        (sleep, energy, soreness, available time, and training focus). This data is processed by
        Google Gemini and is not stored on any server after your session ends.
      </p>
      <p>
        All workout history is stored locally on your device and never transmitted anywhere.
        We do not sell, share, or transmit your personal health data to any third parties beyond the
        AI model used to generate your workout plans.
      </p>
      <p>
        If you have questions about this policy, contact us at{" "}
        <span className="text-primary">hello@pivot.app</span>.
      </p>
    </div>
  );
}

function TosContent() {
  return (
    <div className="space-y-5 text-sm text-foreground/75 leading-relaxed">
      <p className="font-semibold text-foreground">Last updated: May 2026</p>
      <p>
        Pivot is a fitness planning tool. It does not provide medical advice. Always consult a
        qualified healthcare professional before starting any exercise program, especially if you
        have existing injuries or health conditions.
      </p>
      <p>
        The workouts generated are AI suggestions — use your own judgment about what is safe
        for your body on any given day. You use this app at your own risk.
      </p>
      <p>
        You must be 16 years or older to use Pivot. By continuing, you confirm that you meet this requirement.
      </p>
    </div>
  );
}
