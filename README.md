# Pivot — Workouts That Adapt to Your Day

Pivot is a mobile-first fitness app that rewrites your workout every morning based on a 15-second check-in. Too tired? Not enough time? Shoulder tweaky? Pivot adjusts the plan before you step into the gym.

---

## How It Works

1. **Daily check-in** — 4 sliders: sleep quality, energy level, soreness, time available. Optional text note for anything else (e.g. "my shoulder is tweaky").
2. **AI workout generation** — Gemini 2.5 Flash reads your check-in and generates a tailored workout: right exercises, right intensity, right duration.
3. **In-workout pivot** — If a piece of equipment is unavailable or something hurts mid-session, hit the Pivot button on any exercise. Describe the constraint, get an instant swap.
4. **Weekly summary** — Every week, see your training patterns, what you adapted, and what to focus on next.

---

## Core Features

- **Adaptive check-in → workout** — AI selects focus, exercises, sets/reps based on your actual state
- **Live exercise swap** — Swap any exercise mid-workout with a constraint description
- **Re-entry deload** — Returns you at 70% intensity after 4+ days off to avoid injury
- **Weekly insights** — AI summary of your week with pattern detection
- **Past summaries** — Weekly summaries saved to localStorage and browsable in-app
- **5-day plan view** — Provisional schedule that updates after each check-in
- **Dark mode first** — `#C7F73D` accent, Inter font, iPhone 17 Pro frame on desktop
- **Fully offline for non-AI features** — navigation, plan view, and history work without a connection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | React Context + localStorage |
| AI | Google Gemini 2.5 Flash |
| Backend | Supabase Edge Functions (Deno) |
| Routing | React Router v6 |

---

## Running Locally

### Prerequisites
- Node.js 18+ or Bun
- Supabase CLI (`npm install -g supabase`)
- A Supabase project
- A Google AI Studio API key (Gemini)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd remix-of-pivot-daily-main
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

### 3. Set the Gemini API key as a Supabase secret

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

> The Gemini key is **only** stored as a server-side Supabase secret. It is never exposed to the browser.

### 4. Start Supabase edge functions locally

```bash
supabase start
supabase functions serve
```

### 5. Start the frontend

```bash
npm run dev
# Opens at http://localhost:8080
```

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/pivot.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Framework: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

### 3. Set environment variables in Vercel

In your Vercel project settings → Environment Variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon key |

> The Gemini API key is a **Supabase secret** — set it via `supabase secrets set`, not in Vercel.

### 4. Deploy Supabase edge functions

```bash
supabase functions deploy generate-workout
supabase functions deploy swap-exercise
supabase functions deploy generate-reentry-workout
supabase functions deploy generate-weekly-summary
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` / Vercel | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` / Vercel | Supabase anon key (safe for browser) |
| `GEMINI_API_KEY` | Supabase secret only | Google Gemini API key (server-side only, never in browser) |

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| Gemini API down or slow | Falls back to a sensible default workout instantly |
| Network offline | App still loads; non-AI screens (Plan, past summaries) work from localStorage |
| 4+ days missed | Automatically detects absence and generates a 70% deload workout |
| Extreme check-in values | Numeric inputs clamped server-side before reaching Gemini |
| User note too long (>300 chars) | Truncated server-side before prompt injection |
| Prompt injection attempt | Curly braces and backticks stripped from all user inputs |
| Toast overflow | Max 1 toast shown at a time; auto-dismissed after 5 seconds |
| Workout load fails | WorkoutScreen shows an error state with a "Go back" button |

---

## AI Functions

| Function | Trigger | Input | Fallback |
|---|---|---|---|
| `generate-workout` | Daily check-in | Sleep, energy, soreness, time, optional note | Upper Push default workout |
| `generate-reentry-workout` | 4+ day absence detected | None (uses profile + last session) | Full-body deload workout |
| `swap-exercise` | Pivot button mid-workout | Exercise name, constraint description | Cable Crossovers |
| `generate-weekly-summary` | Insights tab open | Week stats | Static summary from mockData |
