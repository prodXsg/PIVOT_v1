import { useState } from "react";

export function AuthScreen({
  onCreateAccount,
  onExistingUser,
}: {
  onCreateAccount: () => void;
  onExistingUser: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showError = emailTouched && email.trim().length > 0 && !emailValid;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) { setEmailTouched(true); return; }
    onExistingUser(email.trim());
  };

  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(34px, env(safe-area-inset-bottom))",
        paddingLeft: 24,
        paddingRight: 24,
        animation: "auth-fade 250ms ease-out both",
      }}
    >
      {/* PIVOT wordmark */}
      <div className="mt-4 flex justify-center" style={{ animation: "auth-rise 320ms 20ms ease-out both" }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "4px",
            color: "#C7F73D",
            fontFamily: "Anton, 'Inter Black', Inter, ui-sans-serif, sans-serif",
          }}
        >
          PIVOT
        </p>
      </div>

      {/* Value-first headline */}
      <div className="mt-8 text-center" style={{ animation: "auth-rise 320ms 80ms ease-out both" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
            color: "hsl(var(--foreground))",
          }}
        >
          Your adaptive training companion.
        </h1>
        <p
          className="mt-2"
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: "hsl(var(--foreground)/0.55)",
            lineHeight: 1.5,
          }}
        >
          Workouts that adapt to your reality.
        </p>
      </div>

      <div className="flex-1" />

      {/* Primary CTA */}
      <div style={{ animation: "auth-rise 320ms 140ms ease-out both" }}>
        <button
          type="button"
          onClick={onCreateAccount}
          className="w-full"
          style={{
            height: 54,
            borderRadius: 16,
            background: "#C7F73D",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.3px",
            color: "#000000",
            cursor: "pointer",
          }}
        >
          Create an Account
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5" style={{ animation: "auth-rise 320ms 180ms ease-out both" }}>
        <div className="flex-1 h-px bg-[hsl(var(--foreground)/0.12)]" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground)/0.35)", letterSpacing: "0.5px" }}>
          OR
        </span>
        <div className="flex-1 h-px bg-[hsl(var(--foreground)/0.12)]" />
      </div>

      {/* Existing user — email */}
      <div style={{ animation: "auth-rise 320ms 220ms ease-out both" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground)/0.55)", marginBottom: 8 }}>
          Already have an account?
        </p>
        <form onSubmit={handleContinue} noValidate>
          <input
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailTouched(false); }}
            onBlur={() => setEmailTouched(true)}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "hsl(var(--muted))",
              border: `1.5px solid ${showError ? "#ff5a5a" : "hsl(var(--foreground)/0.10)"}`,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 15,
              fontWeight: 400,
              color: "hsl(var(--foreground))",
              outline: "none",
              marginBottom: showError ? 6 : 10,
              transition: "border-color 150ms ease-out",
              boxSizing: "border-box",
            }}
          />
          {showError && (
            <p style={{ fontSize: 12, color: "#ff5a5a", marginBottom: 8 }}>
              Enter a valid email address.
            </p>
          )}
          <button
            type="submit"
            disabled={!email.trim()}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "transparent",
              border: `1.5px solid ${email.trim() ? "hsl(var(--foreground)/0.25)" : "hsl(var(--foreground)/0.10)"}`,
              fontSize: 15,
              fontWeight: 600,
              color: email.trim() ? "hsl(var(--foreground))" : "hsl(var(--foreground)/0.3)",
              cursor: email.trim() ? "pointer" : "default",
              transition: "border-color 150ms ease-out, color 150ms ease-out",
            }}
          >
            Continue →
          </button>
        </form>
      </div>

      <div style={{ height: 8 }} />

      <style>{`
        @keyframes auth-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
