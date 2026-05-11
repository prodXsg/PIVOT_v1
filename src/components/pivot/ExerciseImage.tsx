import { useExerciseImage } from "@/hooks/useExerciseImage";

export function ExerciseImage({ name, size = 56 }: { name: string; size?: number }) {
  const { imageUrl, emoji, loading } = useExerciseImage(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        flexShrink: 0,
        overflow: "hidden",
        background: "hsl(var(--muted))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {loading ? (
        <div
          className="animate-soft-pulse"
          style={{ width: "100%", height: "100%", background: "hsl(var(--secondary))", borderRadius: 12 }}
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = "none";
            const parent = el.parentElement;
            if (parent) {
              const fallback = document.createElement("span");
              fallback.textContent = emoji;
              fallback.style.fontSize = `${Math.round(size * 0.4)}px`;
              parent.appendChild(fallback);
            }
          }}
        />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.4) }}>{emoji}</span>
      )}
    </div>
  );
}
