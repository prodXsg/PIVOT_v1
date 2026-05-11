import { useEffect, useState } from "react";
import { SlideToStart } from "./SlideToStart";
import heroImage from "@/assets/welcome-hero.jpg";

export function WelcomeScreen({
  sliderLabel,
  onSlideComplete,
}: {
  sliderLabel: "Get Started" | "I'm Back" | "Continue Workout";
  onSlideComplete: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleComplete = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onSlideComplete(), 280);
  };

  return (
    <div
      className="absolute inset-0 z-50 overflow-hidden bg-[#0A0A0A]"
      style={{
        transition: "transform 280ms ease-out, opacity 280ms ease-out",
        transform: exiting ? "translateY(-20px)" : "translateY(0)",
        opacity: exiting ? 0 : 1,
      }}
    >
      {/* Background image */}
      <img
        src={heroImage}
        alt=""
        aria-hidden="true"
        width={1080}
        height={1920}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(false)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 300ms ease-out" }}
      />

      {/* Gradient overlay — darker at bottom, lighter at top to show image */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.88) 100%)",
          animation: "welcome-bg-pulse 4s ease-in-out infinite",
        }}
      />

      {/* Content */}
      <div
        className="relative h-full w-full flex flex-col items-center"
        style={{
          paddingTop: "max(44px, env(safe-area-inset-top))",
          paddingBottom: "max(34px, env(safe-area-inset-bottom))",
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        {/* PIVOT wordmark — top, centered, 60px below Dynamic Island */}
        <div
          className="w-full flex justify-center"
          style={{ marginTop: 16, animation: "welcome-rise 400ms ease-out both" }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "6px",
              color: "#C7F73D",
              textTransform: "uppercase",
              fontFamily: "Anton, 'Inter Black', Inter, ui-sans-serif, sans-serif",
            }}
          >
            PIVOT
          </p>
        </div>

        <div className="flex-1" />

        {/* Hero text block — unified typographic block */}
        <div
          className="w-full text-center"
          style={{ animation: "welcome-rise 420ms 40ms ease-out both" }}
        >
          <h1
            style={{
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-1px",
              color: "#FFFFFF",
              fontFamily: "Anton, 'Bebas Neue', 'Inter Black', Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            WHEN LIFE
            <br />
            GETS IN
            <br />
            THE WAY
          </h1>
          {/* "PIVOT ANYWAY" — two separate colored spans */}
          <p style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05, marginTop: 6 }}>
            <span style={{ color: "#C7F73D" }}>PIVOT </span>
            <span style={{ color: "#FFFFFF" }}>ANYWAY</span>
          </p>
        </div>

        {/* Subtagline */}
        <p
          className="text-center"
          style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 260,
            animation: "welcome-rise 420ms 120ms ease-out both",
          }}
        >
          Workouts that adapt to your reality.
        </p>

        <div style={{ flex: "0 0 28px" }} />

        {/* Slide CTA */}
        <div
          className="w-full"
          style={{ animation: "welcome-rise 420ms 200ms ease-out both" }}
        >
          <SlideToStart label={sliderLabel} onComplete={handleComplete} />
          <p
            className="text-center"
            style={{
              marginTop: 14,
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.5,
            }}
          >
            No guesswork. No guilt. Just workouts that fit.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes welcome-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes welcome-bg-pulse {
          0%, 100% { opacity: 0.82; }
          50% { opacity: 0.88; }
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-bg-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
