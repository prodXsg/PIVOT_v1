import { useState } from "react";
import { Clock, Dumbbell, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";

type Step = 1 | 2;

const HOW_IT_WORKS = [
  {
    Icon: Clock,
    title: "Check in daily",
    body: "Tell Pivot how you slept, your energy, soreness, and how much time you have.",
  },
  {
    Icon: Dumbbell,
    title: "Get your workout",
    body: "AI generates a plan that fits your exact state today. Not yesterday. Today.",
  },
  {
    Icon: RefreshCw,
    title: "Adapt on the fly",
    body: "Tap any exercise to swap it out around real-life constraints.",
  },
];

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { setUserProfile } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [exiting, setExiting] = useState(false);

  const handleContinue = () => setStep(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const profile = { name: name.trim(), email: email.trim() };
    setUserProfile(profile);
    setExiting(true);
    setTimeout(() => onComplete(), 280);
  };

  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(34px, env(safe-area-inset-bottom))",
        transition: "opacity 280ms ease-out, transform 280ms ease-out",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-16px)" : "translateY(0)",
      }}
    >
      {step === 1 ? (
        <Step1 onContinue={handleContinue} />
      ) : (
        <Step2
          name={name}
          email={email}
          onChangeName={setName}
          onChangeEmail={setEmail}
          onSubmit={handleSubmit}
        />
      )}
      <style>{`
        @keyframes ob-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Step1({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col px-6">
      <div style={{ animation: "ob-rise 380ms ease-out both" }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "2px",
            color: "#C7F73D",
            textTransform: "uppercase",
          }}
        >
          How it works
        </p>
        <h2
          className="mt-2"
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            color: "hsl(var(--foreground))",
          }}
        >
          Built for real life,
          <br />
          not perfect conditions.
        </h2>
      </div>

      <div className="mt-8 flex flex-col gap-6 flex-1">
        {HOW_IT_WORKS.map(({ Icon, title, body }, i) => (
          <div
            key={title}
            className="flex gap-4 items-start"
            style={{
              animation: `ob-rise 380ms ${80 + i * 80}ms ease-out both`,
            }}
          >
            <div
              className="shrink-0 flex items-center justify-center rounded-2xl"
              style={{
                width: 48,
                height: 48,
                background: "rgba(199,247,61,0.12)",
              }}
            >
              <Icon size={22} color="#C7F73D" strokeWidth={1.8} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
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
                  lineHeight: 1.5,
                  color: "hsl(var(--foreground)/0.6)",
                }}
              >
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ animation: "ob-rise 380ms 340ms ease-out both" }}>
        <button
          type="button"
          onClick={onContinue}
          className="w-full"
          style={{
            height: 52,
            borderRadius: 16,
            background: "#C7F73D",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: "#000000",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function Step2({
  name,
  email,
  onChangeName,
  onChangeEmail,
  onSubmit,
}: {
  name: string;
  email: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 52,
    borderRadius: 14,
    background: "hsl(var(--muted))",
    border: "1px solid hsl(var(--foreground)/0.10)",
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 15,
    fontWeight: 500,
    color: "hsl(var(--foreground))",
    outline: "none",
  };

  return (
    <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6">
      <div style={{ animation: "ob-rise 380ms ease-out both" }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "2px",
            color: "#C7F73D",
            textTransform: "uppercase",
          }}
        >
          One last thing
        </p>
        <h2
          className="mt-2"
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            color: "hsl(var(--foreground))",
          }}
        >
          What should we
          <br />
          call you?
        </h2>
      </div>

      <div className="mt-8 flex flex-col gap-3 flex-1" style={{ animation: "ob-rise 380ms 80ms ease-out both" }}>
        <div>
          <label
            htmlFor="ob-name"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.5px",
              color: "hsl(var(--foreground)/0.5)",
              marginBottom: 6,
            }}
          >
            Your name
          </label>
          <input
            id="ob-name"
            type="text"
            autoComplete="given-name"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label
            htmlFor="ob-email"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.5px",
              color: "hsl(var(--foreground)/0.5)",
              marginBottom: 6,
            }}
          >
            Email <span style={{ color: "hsl(var(--foreground)/0.35)" }}>(optional)</span>
          </label>
          <input
            id="ob-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ animation: "ob-rise 380ms 160ms ease-out both" }}>
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 16,
            background: name.trim() ? "#C7F73D" : "hsl(var(--muted))",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.5px",
            color: name.trim() ? "#000000" : "hsl(var(--foreground)/0.3)",
            cursor: name.trim() ? "pointer" : "default",
            transition: "background 200ms ease-out, color 200ms ease-out",
          }}
        >
          Let's go
        </button>
      </div>
    </form>
  );
}

