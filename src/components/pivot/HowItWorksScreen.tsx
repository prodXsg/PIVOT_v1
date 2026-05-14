import { Clock, Dumbbell, RefreshCw } from "lucide-react";
import { SlideToStart } from "./SlideToStart";

const ITEMS = [
  {
    Icon: Clock,
    title: "Check in",
    body: "Sleep, energy, soreness, time — 15 seconds is all it takes.",
    prominent: false,
  },
  {
    Icon: Dumbbell,
    title: "Get your plan",
    body: "A workout built around your exact state — not a generic template.",
    prominent: false,
  },
  {
    Icon: RefreshCw,
    title: "Pivot when life happens",
    body: "Swap any exercise around real constraints, any time mid-workout.",
    prominent: true,
  },
];

export function HowItWorksScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(34px, env(safe-area-inset-bottom))",
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Header */}
      <div style={{ animation: "hiw-rise 360ms ease-out both" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "2px",
            color: "#C7F73D",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          How it works
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            color: "hsl(var(--foreground))",
          }}
        >
          Workouts that read
          <br />
          the room
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.5,
            color: "hsl(var(--foreground)/0.50)",
            maxWidth: 300,
          }}
        >
          Your body is different every day. Your plan should be too.
        </p>
      </div>

      {/* Items */}
      <div className="mt-7 flex flex-col gap-3">
        {ITEMS.map(({ Icon, title, body, prominent }, i) => (
          <div
            key={title}
            className="flex gap-3.5 items-start rounded-2xl"
            style={{
              padding: prominent ? 16 : "12px 4px",
              background: prominent ? "rgba(199,247,61,0.05)" : "transparent",
              border: prominent ? "1px solid rgba(199,247,61,0.15)" : "1px solid transparent",
              animation: `hiw-rise 360ms ${80 + i * 80}ms ease-out both`,
            }}
          >
            <div
              className="shrink-0 flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: prominent
                  ? "rgba(199,247,61,0.14)"
                  : "rgba(199,247,61,0.07)",
                boxShadow: prominent
                  ? "0 0 0 1px rgba(199,247,61,0.10), 0 2px 8px rgba(199,247,61,0.08)"
                  : "none",
              }}
            >
              <Icon size={prominent ? 20 : 18} color="#C7F73D" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontSize: 15,
                  fontWeight: prominent ? 800 : 600,
                  color: prominent ? "#C7F73D" : "hsl(var(--foreground))",
                  lineHeight: 1.25,
                }}
              >
                {title}
              </p>
              <p
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: "hsl(var(--foreground)/0.45)",
                }}
              >
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bridge + CTA */}
      <div className="flex-1" />
      <div style={{ animation: "hiw-rise 360ms 320ms ease-out both" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.5,
            color: "hsl(var(--foreground)/0.35)",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          No guesswork. No guilt. Just adaptation.
        </p>
        <SlideToStart label="Let's go" onComplete={onContinue} />
      </div>

      <style>{`
        @keyframes hiw-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
