import { useRef, useState, useEffect } from "react";

const THUMB_SIZE = 52;
const PAD = 4;
const COMPLETE_THRESHOLD = 0.80;

export function SlideToStart({
  label,
  onComplete,
}: {
  label: string;
  onComplete: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpringBack, setIsSpringBack] = useState(false);
  const [done, setDone] = useState(false);
  const [idle, setIdle] = useState(true);

  // Stop idle pulse when user touches
  useEffect(() => {
    if (isDragging) setIdle(false);
  }, [isDragging]);

  const getMaxX = () => {
    const track = trackRef.current;
    if (!track) return 200;
    return track.offsetWidth - THUMB_SIZE - PAD * 2;
  };

  const triggerComplete = () => {
    if (done) return;
    setDone(true);
    setIsDragging(false);
    // Snap to end
    const maxX = getMaxX();
    setDragX(maxX);
    setTimeout(() => onComplete(), 240);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX - dragX;
    setIsDragging(true);
    setIsSpringBack(false);
    setIdle(false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || done) return;
    const maxX = getMaxX();
    const newX = Math.max(0, Math.min(e.clientX - startXRef.current, maxX));
    setDragX(newX);
    if (newX >= maxX) triggerComplete();
  };

  const onPointerUp = () => {
    if (done) return;
    setIsDragging(false);
    const maxX = getMaxX();
    const progress = maxX > 0 ? dragX / maxX : 0;
    if (progress >= COMPLETE_THRESHOLD) {
      triggerComplete();
    } else {
      setIsSpringBack(true);
      setDragX(0);
      setTimeout(() => setIsSpringBack(false), 440);
    }
  };

  const maxX = getMaxX();
  const progress = maxX > 0 ? Math.min(dragX / maxX, 1) : 0;

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative select-none w-full"
      style={{
        height: THUMB_SIZE + PAD * 2,
        borderRadius: (THUMB_SIZE + PAD * 2) / 2,
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        cursor: done ? "default" : isDragging ? "grabbing" : "grab",
        overflow: "hidden",
      }}
    >
      {/* Progress fill */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: "#C7F73D",
          opacity: progress * 0.22,
          transition: isDragging ? "none" : "opacity 300ms ease-out",
        }}
      />

      {/* Track label */}
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.70)",
          opacity: Math.max(0, 1 - progress * 2),
          transition: isDragging ? "none" : "opacity 200ms ease-out",
          userSelect: "none",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      {/* Thumb */}
      <div
        style={{
          position: "absolute",
          top: PAD,
          left: PAD + dragX,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: "9999px",
          background: "#C7F73D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 14px rgba(199,247,61,0.40)",
          transition: done
            ? "left 200ms ease-out"
            : isSpringBack
            ? "left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : isDragging
            ? "none"
            : "left 200ms ease-out",
          animation: idle ? "slide-idle 2s ease-in-out infinite" : undefined,
          willChange: "left",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @keyframes slide-idle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}
