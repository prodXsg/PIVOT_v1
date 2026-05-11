import { useRef, useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

const DIGIT_COUNT = 6;
const RESEND_COOLDOWN = 30;

export function OTPScreen({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const { setUserProfile } = useApp();
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [lastFilled, setLastFilled] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");
  const isComplete = code.length === DIGIT_COUNT;

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setLastFilled(idx);
    if (digit && idx < DIGIT_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (digit && idx === DIGIT_COUNT - 1) {
      const full = next.join("");
      if (full.length === DIGIT_COUNT && !verified) {
        setTimeout(() => {
          if (!verified) {
            const btn = document.getElementById("otp-verify-btn");
            btn?.click();
          }
        }, 80);
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        const next = [...digits];
        next[idx - 1] = "";
        setDigits(next);
        inputRefs.current[idx - 1]?.focus();
      } else {
        const next = [...digits];
        next[idx] = "";
        setDigits(next);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < DIGIT_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = Array(DIGIT_COUNT).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = () => {
    if (!isComplete || verified) return;
    setVerified(true);
    setTimeout(() => {
      try {
        const pendingRaw = localStorage.getItem("pivot_pending_user");
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        if (pending?.name && pending?.email) {
          setUserProfile({ name: pending.name, email: pending.email });
          localStorage.removeItem("pivot_pending_user");
        } else {
          setUserProfile({ name: "", email });
        }
      } catch {
        setUserProfile({ name: "", email });
      }
      onVerified();
    }, 700);
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    toast.success("Code resent!");
    setResendCountdown(RESEND_COOLDOWN);
  };

  const maskedEmail =
    email.length > 4
      ? email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c)
      : email;

  return (
    <div
      className="absolute inset-0 z-40 bg-background flex flex-col"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(34px, env(safe-area-inset-bottom))",
        paddingLeft: 24,
        paddingRight: 24,
        animation: "otp-fade 250ms ease-out both",
      }}
    >
      {/* Header */}
      <div className="mt-4" style={{ animation: "otp-rise 320ms 40ms ease-out both" }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.4px",
            lineHeight: 1.15,
            color: "hsl(var(--foreground))",
          }}
        >
          Almost there 💪
        </h1>
        <p
          className="mt-2"
          style={{
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.5,
            color: "hsl(var(--foreground)/0.55)",
          }}
        >
          We sent a quick code to{" "}
          <span style={{ color: "hsl(var(--foreground)/0.85)", fontWeight: 500 }}>
            {maskedEmail}
          </span>{" "}
          — enter it below and you're in.
        </p>
      </div>

      {/* Digit boxes */}
      <div
        className="flex gap-2.5 mt-8"
        style={{ animation: "otp-rise 320ms 100ms ease-out both" }}
        onPaste={handlePaste}
      >
        {digits.map((d, idx) => {
          const isFilled = d !== "";
          const isLastFilled = lastFilled === idx && isFilled;
          const isSuccess = verified && isFilled;
          return (
            <div
              key={idx}
              className="flex-1"
              style={{ animation: `otp-scalein 280ms ${idx * 30}ms ease-out both` }}
            >
              <input
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
                aria-label={`Digit ${idx + 1}`}
                style={{
                  width: "100%",
                  height: 56,
                  borderRadius: 14,
                  background: "hsl(var(--muted))",
                  border: `2px solid ${
                    isSuccess
                      ? "#C7F73D"
                      : isFilled
                      ? "hsl(var(--foreground)/0.25)"
                      : "hsl(var(--foreground)/0.10)"
                  }`,
                  backgroundColor: isSuccess ? "rgba(199,247,61,0.15)" : "hsl(var(--muted))",
                  fontSize: 22,
                  fontWeight: 700,
                  textAlign: "center",
                  color: isSuccess ? "#C7F73D" : "hsl(var(--foreground))",
                  outline: "none",
                  cursor: "text",
                  transform: isLastFilled ? "scale(1.05)" : "scale(1)",
                  transition: "border-color 150ms ease-out, background-color 150ms ease-out, transform 120ms ease-out, color 200ms ease-out",
                  caretColor: "transparent",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Motivational line */}
      {!verified && (
        <p
          className="mt-4 text-center"
          style={{
            fontSize: 13,
            color: "hsl(var(--foreground)/0.40)",
            lineHeight: 1.4,
            animation: "otp-rise 320ms 160ms ease-out both",
          }}
        >
          Your personalized training experience is ready.
        </p>
      )}

      {/* Success overlay */}
      {verified && (
        <div
          className="mt-6 flex items-center justify-center gap-2"
          style={{ animation: "otp-checkmark 300ms ease-out both" }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "9999px",
              background: "#C7F73D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={16} color="#000" strokeWidth={2.8} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#C7F73D" }}>
            Verified — let's go!
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      {!verified && (
        <div style={{ animation: "otp-rise 320ms 220ms ease-out both" }}>
          <button
            id="otp-verify-btn"
            type="button"
            onClick={handleVerify}
            disabled={!isComplete}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 16,
              background: isComplete ? "#C7F73D" : "hsl(var(--muted))",
              border: "none",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.3px",
              color: isComplete ? "#000000" : "hsl(var(--foreground)/0.3)",
              cursor: isComplete ? "pointer" : "default",
              transition: "background 200ms ease-out, color 200ms ease-out",
              marginBottom: 14,
            }}
          >
            Verify →
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCountdown > 0}
            style={{
              width: "100%",
              height: 44,
              background: "transparent",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              color: resendCountdown > 0
                ? "hsl(var(--foreground)/0.25)"
                : "hsl(var(--foreground)/0.45)",
              cursor: resendCountdown > 0 ? "default" : "pointer",
              letterSpacing: "0.2px",
              transition: "color 200ms ease-out",
            }}
          >
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes otp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes otp-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes otp-scalein {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes otp-checkmark {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
