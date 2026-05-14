import { useState } from "react";
import { validateEmail, couldBeValidEmail } from "@/lib/emailValidation";

export function AuthScreen({
  onCreateAccount,
  onExistingUser,
  onEmailExists,
}: {
  onCreateAccount: () => void;
  onExistingUser: (email: string) => void;
  onEmailExists: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate on blur for production-grade email quality
  const validateOnBlur = () => {
    if (!email.trim()) {
      setValidationError(null);
      return;
    }
    const result = validateEmail(email.trim());
    setValidationError(result.isValid ? null : result.error || "Invalid email");
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateOnBlur();
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear error on change to avoid jitter (only re-validate on blur)
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation before submit
    const validation = validateEmail(email.trim());
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid email");
      setEmailTouched(true);
      return;
    }
    
    setCheckingEmail(true);
    // Simulate checking if email exists (replace with actual API call)
    try {
      // Mock check: assume email exists if it ends with @existing.com
      const exists = email.trim().toLowerCase().endsWith('@existing.com');
      if (exists) {
        onEmailExists(email.trim());
      } else {
        onExistingUser(email.trim());
      }
    } catch (error) {
      // Handle error
      onExistingUser(email.trim());
    } finally {
      setCheckingEmail(false);
    }
  };

  // Button enable logic: permissive during typing, strict on submit
  const canSubmit = couldBeValidEmail(email) && !checkingEmail;

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
      <div className="mt-6 text-center" style={{ animation: "auth-rise 320ms 80ms ease-out both" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
            color: "hsl(var(--foreground))",
          }}
        >
          Intelligent training that adapts to you.
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
          Recovery-aware workouts, personalized to your daily state.
        </p>
      </div>

      {/* Primary CTA */}
      <div className="mt-8" style={{ animation: "auth-rise 320ms 140ms ease-out both" }}>
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
          Get Started
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6" style={{ animation: "auth-rise 320ms 180ms ease-out both" }}>
        <div className="flex-1 h-px bg-[hsl(var(--foreground)/0.12)]" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground)/0.35)", letterSpacing: "0.5px" }}>
          OR
        </span>
        <div className="flex-1 h-px bg-[hsl(var(--foreground)/0.12)]" />
      </div>

      {/* Existing user — email */}
      <div style={{ animation: "auth-rise 320ms 220ms ease-out both" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground)/0.55)", marginBottom: 8 }}>
          Returning user?
        </p>
        <form onSubmit={handleContinue} noValidate>
          <input
            type="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={checkingEmail}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "hsl(var(--muted))",
              border: `1.5px solid ${validationError && emailTouched ? "#ff5a5a" : "hsl(var(--foreground)/0.10)"}`,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 15,
              fontWeight: 400,
              color: "hsl(var(--foreground))",
              outline: "none",
              marginBottom: validationError && emailTouched ? 6 : 12,
              transition: "border-color 150ms ease-out",
              boxSizing: "border-box",
            }}
          />
          {validationError && emailTouched && (
            <p style={{ fontSize: 12, color: "#ff5a5a", marginBottom: 8 }}>
              {validationError}
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              background: "transparent",
              border: `1.5px solid ${canSubmit ? "hsl(var(--foreground)/0.25)" : "hsl(var(--foreground)/0.10)"}`,
              fontSize: 15,
              fontWeight: 600,
              color: canSubmit ? "hsl(var(--foreground))" : "hsl(var(--foreground)/0.3)",
              cursor: canSubmit ? "pointer" : "default",
              transition: "border-color 150ms ease-out, color 150ms ease-out",
            }}
          >
            {checkingEmail ? "Checking..." : "Continue →"}
          </button>
        </form>
      </div>

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
