import { Home, BarChart3, User } from "lucide-react";
import { useApp, Tab } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem =
  | { id: Exclude<Tab, "profile">; label: string; kind: "icon"; Icon: typeof Home }
  | { id: "profile"; label: string; kind: "avatar" };

const BASE_ITEMS_PRE: NavItem[] = [
  { id: "home",     label: "Home",     kind: "icon", Icon: Home },
  { id: "insights", label: "Insights", kind: "icon", Icon: BarChart3 },
  { id: "profile",  label: "Profile",  kind: "avatar" },
];

const BASE_ITEMS_POST: NavItem[] = [
  { id: "home",     label: "Home",     kind: "icon", Icon: Home },
  { id: "insights", label: "Insights", kind: "icon", Icon: BarChart3 },
  { id: "profile",  label: "Profile",  kind: "avatar" },
];

export function BottomNav() {
  const { tab, setTab, hasGeneratedWorkout, userProfile } = useApp();
  const rawName = userProfile?.name?.trim() || "";
  const avatarInitial = rawName ? rawName.charAt(0).toUpperCase() : "";
  const [pulse, setPulse] = useState<Tab | null>(null);

  const items: NavItem[] = hasGeneratedWorkout ? BASE_ITEMS_POST : BASE_ITEMS_PRE;
  const cols = items.length as 3 | 4;

  const handleTap = (id: Tab) => {
    setPulse(id);
    setTab(id);
    window.setTimeout(() => setPulse((p) => (p === id ? null : p)), 140);
  };

  return (
    <nav
      className="sticky bottom-0 left-0 right-0 bg-elevated/95 backdrop-blur-xl border-t border-[hsl(var(--foreground)/0.08)] z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul
        className="px-2 pt-2 pb-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          minHeight: 64,
        }}
      >
        {items.map((item) => {
          const { id, label } = item;
          const active = tab === id;
          const isPulsing = pulse === id;

          return (
            <li key={id}>
              <button
                onClick={() => handleTap(id)}
                aria-label={label}
                aria-selected={active}
                role="tab"
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg",
                  active ? "text-primary" : "text-foreground/55 hover:text-foreground"
                )}
                style={{
                  transform: isPulsing ? "scale(1.05)" : "scale(1)",
                  transition: "transform 140ms ease-out, color 150ms ease-out",
                }}
              >
                {item.kind === "avatar" ? (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "9999px",
                      background: active ? "rgba(199,247,61,0.18)" : "hsl(var(--foreground)/0.10)",
                      border: `1.5px solid ${active ? "#C7F73D" : "hsl(var(--foreground)/0.22)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "border-color 150ms, background 150ms",
                    }}
                  >
                    {avatarInitial ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: active ? "#C7F73D" : "hsl(var(--foreground)/0.55)",
                          transition: "color 150ms",
                        }}
                      >
                        {avatarInitial}
                      </span>
                    ) : (
                      <User
                        size={13}
                        strokeWidth={2}
                        style={{ color: active ? "#C7F73D" : "hsl(var(--foreground)/0.55)" }}
                      />
                    )}
                  </div>
                ) : (
                  <item.Icon size={24} strokeWidth={active ? 2.4 : 1.8} />
                )}
                <span
                  className={cn(
                    "text-[11px] font-semibold tracking-wide",
                    active ? "text-primary" : "text-foreground/55"
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <style>{`
        @keyframes nav-fade-in {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </nav>
  );
}
