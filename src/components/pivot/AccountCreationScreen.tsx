import { useState } from "react";

export function AccountCreationScreen({
  onSubmit,
}: {
  onSubmit: (name: string, email: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const trimmedName = name.trim();
  const nameValid =
    trimmedName.length >= 2 &&
    trimmedName.length <= 30 &&
    !/^\d+$/.test(trimmedName);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = nameValid && emailValid;

  const showNameError = nameTouched && !nameValid;
  const showEmailError = emailTouched && email.trim().length > 0 && !emailValid;

  const nameErrorMsg =
    trimmedName.length === 0
      ? "Please enter your name"
      : trimmedName.length < 2
      ? "Name must be at least 2 characters"
      : trimmedName.length > 30
      ? "Name must be 30 characters or fewer"
      : /^\d+$/.test(trimmedName)
      ? "Please enter a valid name"
      : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setEmailTouched(true);
    if (!canSubmit) return;
    try {
      localStorage.setItem("pivot_pending_user", JSON.stringify({ name: name.trim(), email: email.trim() }));
    } catch {}
    onSubmit(name.trim(), email.trim());
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 52,
    borderRadius: 14,
    background: "hsl(var(--muted))",
    border: `1.5px solid ${hasError ? "#ff5a5a" : "hsl(var(--foreground)/0.10)"}`,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 15,
    fontWeight: 400,
    color: "hsl(var(--foreground))",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 150ms ease-out",
  });

  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(34px, env(safe-area-inset-bottom))",
        paddingLeft: 24,
        paddingRight: 24,
        animation: "ac-fade 250ms ease-out both",
      }}
    >
      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-2" style={{ animation: "ac-rise 320ms 20ms ease-out both" }}>
        <div style={{ width: 20, height: 6, borderRadius: 999, background: "#C7F73D" }} />
        <div style={{ width: 6, height: 6, borderRadius: 999, background: "hsl(var(--foreground)/0.18)" }} />
      </div>

      {/* Header */}
      <div className="mt-6" style={{ animation: "ac-rise 320ms 40ms ease-out both" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
            color: "hsl(var(--foreground))",
          }}
        >
          Create your account
        </h1>
        <p
          className="mt-1"
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: "hsl(var(--foreground)/0.50)",
          }}
        >
          You're almost in.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 mt-8">
        {/* Fields */}
        <div
          className="flex flex-col gap-4 flex-1"
          style={{ animation: "ac-rise 320ms 100ms ease-out both" }}
        >
          <div>
            <label
              htmlFor="ac-name"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.4px",
                color: "hsl(var(--foreground)/0.45)",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Full Name
            </label>
            <input
              id="ac-name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              maxLength={31}
              onChange={(e) => { setName(e.target.value); setNameTouched(false); }}
              onBlur={() => setNameTouched(true)}
              style={inputStyle(showNameError)}
            />
            {showNameError && (
              <p style={{ fontSize: 12, color: "#ff5a5a", marginTop: 5 }}>
                {nameErrorMsg}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="ac-email"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.4px",
                color: "hsl(var(--foreground)/0.45)",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Email Address
            </label>
            <input
              id="ac-email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailTouched(false); }}
              onBlur={() => setEmailTouched(true)}
              style={inputStyle(showEmailError)}
            />
            {showEmailError && (
              <p style={{ fontSize: 12, color: "#ff5a5a", marginTop: 5 }}>
                Enter a valid email address.
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ animation: "ac-rise 320ms 160ms ease-out both" }}>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 16,
              background: canSubmit ? "#C7F73D" : "hsl(var(--muted))",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.3px",
              color: canSubmit ? "#000000" : "hsl(var(--foreground)/0.3)",
              cursor: canSubmit ? "pointer" : "default",
              transition: "background 200ms ease-out, color 200ms ease-out",
            }}
          >
            Start Training →
          </button>
        </div>
      </form>

      <style>{`
        @keyframes ac-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ac-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
