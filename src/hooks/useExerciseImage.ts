import { useEffect, useState } from "react";

const CACHE_KEY = "pivot_exercise_images_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = { url: string | null; ts: number };
type ImageCache = Record<string, CacheEntry>;

function loadCache(): ImageCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveCache(cache: ImageCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function emojiForExercise(name: string): string {
  const n = name.toLowerCase();
  if (/squat|lunge|deadlift|rdl|leg press|hip hinge|glute|hamstring|quad|calf/.test(n)) return "🦵";
  if (/pull.?up|chin.?up|lat pulldown|row|back|rhomboid|rear delt/.test(n)) return "🔙";
  if (/bench|chest|fly|push.?up|pec|incline|decline/.test(n)) return "🏋️";
  if (/shoulder|overhead press|lateral raise|front raise|delt/.test(n)) return "💪";
  if (/bicep|curl|hammer|preacher/.test(n)) return "💪";
  if (/tricep|pushdown|dip|skull/.test(n)) return "💪";
  if (/plank|core|ab|crunch|sit.?up|pallof|hollow/.test(n)) return "🔥";
  if (/cardio|run|bike|row machine|zone|treadmill|elliptical/.test(n)) return "🫀";
  return "🏋️";
}

async function fetchWgerImage(exerciseName: string): Promise<string | null> {
  const term = encodeURIComponent(exerciseName);
  const url = `https://wger.de/api/v2/exercise/search/?term=${term}&language=english&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return null;
  const data = await res.json();
  const suggestion = data?.suggestions?.[0];
  const thumbnail = suggestion?.data?.image_thumbnail || suggestion?.data?.image;
  return thumbnail ?? null;
}

export function useExerciseImage(exerciseName: string): {
  imageUrl: string | null;
  emoji: string;
  loading: boolean;
} {
  const emoji = emojiForExercise(exerciseName);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseName) { setLoading(false); return; }
    let cancelled = false;

    const cache = loadCache();
    const entry = cache[exerciseName];
    const now = Date.now();

    if (entry && now - entry.ts < CACHE_TTL_MS) {
      setImageUrl(entry.url);
      setLoading(false);
      return;
    }

    fetchWgerImage(exerciseName)
      .then((url) => {
        if (cancelled) return;
        setImageUrl(url);
        setLoading(false);
        const updated = { ...loadCache(), [exerciseName]: { url, ts: Date.now() } };
        saveCache(updated);
      })
      .catch(() => {
        if (!cancelled) { setImageUrl(null); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [exerciseName]);

  return { imageUrl, emoji, loading };
}
