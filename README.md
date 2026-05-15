# Pivot

**Adaptive workouts that adjust to your actual day, not a fixed template.**

Pivot is a mobile-first AI fitness app that dynamically composes workouts based on readiness, recovery, soreness, available time, and real-world constraints.

Instead of following a rigid training plan, users complete a lightweight daily check-in and Pivot generates a personalized workout that adapts to:

* energy levels
* sleep quality
* soreness
* available workout time
* equipment limitations
* pain or movement constraints

The system combines deterministic adaptive logic with AI-assisted workout generation to create sessions that feel intentional, personalized, and context-aware.

---

# Why Pivot Exists

Most fitness apps optimize for consistency of plans.

Pivot optimizes for consistency of training.

The system assumes:

* recovery fluctuates daily
* gym environments are unpredictable
* users miss sessions
* energy levels change
* adherence matters more than rigid perfection

Instead of forcing users to follow static programming, Pivot continuously adapts around the user’s real-world condition.

---

# Core Features

## Adaptive Daily Check-In

Users complete a lightweight readiness check-in including:

* sleep quality
* energy level
* soreness
* available workout time
* optional contextual notes

Example:

> “Left shoulder feels tweaky today.”

The system dynamically adjusts:

* workout focus
* exercise selection
* intensity
* volume
* session duration

---

## Constraint-Aware Workout Generation

Pivot uses a hybrid adaptive engine combining:

* deterministic scoring
* movement-pattern balancing
* recovery-aware logic
* AI-assisted composition

to generate workouts that:

* preserve workout identity
* respect recovery constraints
* adapt around user intent
* maintain session quality

Examples:

* Pull + abs/core emphasis
* Full Body + hamstrings + calves
* Legs + glute emphasis

---

## Layered Workout Intent System

The workout engine separates:

* workout identity
  from:
* emphasis modifiers

Layer 1:

* Push
* Pull
* Legs
* Full Body

Layer 2:

* shoulders
* calves
* hamstrings
* abs/core
* rear delts
* forearms
* and other emphasis areas

The adaptive engine uses constraint-aware composition logic so workouts remain structurally coherent while still reflecting explicit user priorities.

---

## In-Workout Pivoting

Every exercise supports live replacement.

If:

* equipment is unavailable
* pain appears mid-session
* movement feels uncomfortable
* the gym is crowded

users can tap:

> Pivot

and describe the issue.

The adaptive engine generates a replacement while preserving:

* workout structure
* muscle intent
* movement quality
* duration balance

---

## Recovery-Aware Re-Entry

If users miss multiple training days, Pivot automatically detects inactivity and generates:

* reduced intensity
* lower fatigue
* recovery-aware re-entry workouts

This helps reduce:

* injury risk
* excessive soreness
* unsustainable training spikes

---

## Weekly Insights

Pivot generates adaptive weekly summaries including:

* training consistency
* recovery patterns
* skipped movements
* recurring soreness
* workout emphasis trends
* adaptation behaviors

Summaries are stored locally and remain browsable in-app.

---

# Adaptive Engine Architecture

Pivot uses a hybrid architecture combining:

* deterministic constraint systems
* adaptive scoring
* AI-assisted workout composition

The system evolved from:

* weighted template selection

toward:

* constraint-aware adaptive workout composition

Core adaptive behaviors include:

* workout identity preservation
* emphasis slot reservation
* readiness-aware scaling
* movement-pattern balancing
* adaptive fallback handling
* deterministic safety constraints
* recovery-aware prioritization
* live exercise replacement
* graceful degradation under conflicting constraints

The engine prioritizes:

1. safety and recovery constraints
2. explicit user-selected emphasis areas
3. workout identity preservation
4. optimization and balancing heuristics

---

# Tech Stack

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Frontend         | React 18 + TypeScript + Vite   |
| Styling          | Tailwind CSS v3 + shadcn/ui    |
| State Management | React Context + localStorage   |
| Backend          | Supabase Edge Functions (Deno) |
| AI               | Google Gemini 2.5 Flash        |
| Routing          | React Router v6                |

---

# Failure Handling & Edge Cases

| Scenario                  | Behavior                                         |
| ------------------------- | ------------------------------------------------ |
| Gemini unavailable        | Falls back to deterministic default workouts     |
| Network offline           | Non-AI features continue working                 |
| 4+ missed training days   | Generates adaptive deload/re-entry sessions      |
| Extreme readiness values  | Inputs clamped server-side                       |
| Long user notes           | Truncated server-side                            |
| Prompt injection attempts | User inputs sanitized before AI processing       |
| Workout load failure      | Graceful recovery/error states                   |
| Conflicting constraints   | Adaptive prioritization and graceful degradation |

---

# Design Principles

Pivot prioritizes:

* adaptive realism over rigid programming
* recovery-aware training
* explainable personalization
* deterministic safety constraints
* lightweight AI augmentation
* graceful degradation
* mobile-first interaction design

---

# Future Direction

Planned evolution areas include:

* progression tracking
* movement-level performance memory
* adaptive microcycles
* fatigue accumulation modeling
* long-term recovery adaptation
* richer workout-composition intelligence
* deeper personalization systems

---

# License

Private project. All rights reserved.

Force rebuild