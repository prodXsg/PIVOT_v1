import { Clock, Dumbbell, RefreshCw } from "lucide-react";
import { SlideToStart } from "./SlideToStart";

const ITEMS = [
  {
    Icon: Clock,
    title: "Check in — 15 seconds",
    body: "Tell Pivot your sleep, energy, soreness, and how much time you have today.",
    prominent: false,
  },
  {
    Icon: Dumbbell,
    title: "Get today's workout",
    body: "AI builds a plan around your exact state — not a generic template.",
    prominent: false,
  },
  {
    Icon: RefreshCw,
    title: "Pivot when life happens",
    body: "Swap any exercise around real constraints, any time during your workout.",
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
      <div className="text-center" style={{ animation: "hiw-rise 360ms ease-out both" }}>
        <h1
          className="mt-4"
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
            color: "hsl(var(--foreground))",
          }}
        >
          Here's how Pivot works
        </h1>
      </div>

      {/* Items */}
      <div className="mt-6 flex flex-col gap-5 flex-1">
        {ITEMS.map(({ Icon, title, body, prominent }, i) => (
          <div
            key={title}
            className={`flex gap-4 items-start rounded-2xl p-4 ${prominent ? "border border-primary/20" : ""}`}
            style={{
              background: prominent ? "rgba(199,247,61,0.06)" : "transparent",
              animation: `hiw-rise 360ms ${60 + i * 70}ms ease-out both`,
            }}
          >
            <div
              className="shrink-0 flex items-center justify-center rounded-2xl"
              style={{
                width: prominent ? 52 : 46,
                height: prominent ? 52 : 46,
                background: prominent ? "rgba(199,247,61,0.18)" : "rgba(199,247,61,0.10)",
              }}
            >
              <Icon size={prominent ? 26 : 22} color="#C7F73D" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p
                style={{
                  fontSize: prominent ? 17 : 15,
                  fontWeight: prominent ? 800 : 700,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </p>
              <p
                className="mt-1"
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.55,
                  color: "hsl(var(--foreground)/0.55)",
                }}
              >
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Slide CTA */}
      <div style={{ marginTop: 16, animation: "hiw-rise 360ms 290ms ease-out both" }}>
        <div style={{ borderRadius: 20, background: "#0A0A0A", padding: "14px 14px 16px" }}>
          <SlideToStart label="Let's go" onComplete={onContinue} />
        </div>
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
