# Future Paths Build Specification v1

## Purpose

This document defines how Future Paths is implemented.

The Bible defines the vision.

The Build Specification defines the architecture.

Future Paths should be built according to this document unless explicitly changed.

---

# Technical Stack

## Frontend

* Next.js 16+
* TypeScript
* Tailwind CSS

## Backend

* Supabase
* PostgreSQL
* Row Level Security

## AI

* Anthropic Claude API

## Infrastructure

* Vercel
* GitHub

## Future

* Stripe
* Resend

---

# Core Data Model

Future Paths revolves around:

## User

Owns all data.

---

## Moment

A meaningful decision or uncertainty.

Example:

* Should I move cities?
* Should I leave my job?

---

## Path

A possible direction generated from a Moment.

Contains:

* Description
* Benefits
* Consequences
* Future Shift
* Themes

---

## Check-In

Reality layer.

Records what actually happened.

Check-Ins carry more weight than path selection.

---

## Future Self

An identity trajectory emerging from repeated patterns.

Examples:

* The Connector
* The Builder
* The Explorer

Future Selves have momentum.

---

## Current Self

The platform's current understanding of the user.

Always evolving.

Never permanent.

---

## Reflection

Explores an unchosen path.

Includes:

* Alternative Path
* Could've Been You
* Still Available Today

---

## Alternate Self

An unrealized identity trajectory.

Built from repeated reflections.

---

## Timeline Event

Historical record of meaningful activity.

---

# Identity Engine

Identity is built from recurring themes.

Examples:

* Connection
* Courage
* Curiosity
* Stability
* Creativity
* Belonging

---

Themes influence:

* Future Selves
* Current Self
* Reflections
* Identity Updates

---

# Future Self Progression

## Possible Future

Requirements:

1+ Moment

---

## Emerging Future

Requirements:

5+ Moments

---

## Future Self

Requirements:

10+ Moments

3+ Check-Ins

---

## Advanced Identity

Requirements:

15+ Moments

10+ Check-Ins

5+ Identity Prompts

Unlocks:

* Current Self
* Contradictions
* Advanced Insights

---

# AI Systems

## Crossroad Generator

Input:

Moment

Output:

* Current Understanding
* Five Paths
* Benefits
* Consequences
* Future Shifts

---

## Check-In Generator

Input:

Moment
Chosen Path
Check-In

Output:

* Reality Summary
* Theme Changes
* Identity Impact

---

## Future Self Generator

Input:

User history

Output:

* Possible Futures
* Emerging Futures
* Future Selves

---

## Current Self Generator

Input:

Behavior patterns

Output:

Current Self summary

---

## Reflection Generator

Input:

Chosen path
Unchosen paths

Output:

* Alternative Path
* Could've Been You
* Still Available Today

---

## Contradiction Generator

Input:

Behavior
Identity responses

Output:

Identity tensions

---

# Database Tables

## profiles

User profiles.

---

## moments

Stores all moments.

---

## paths

Stores generated paths.

---

## check_ins

Stores reality updates.

---

## future_selves

Stores active identity trajectories.

---

## future_self_events

Stores momentum changes.

---

## current_self

Stores current identity summary.

---

## reflections

Stores reflections.

---

## alternate_selves

Stores unrealized identities.

---

## identity_prompts

Stores prompt templates.

---

## identity_prompt_responses

Stores prompt answers.

---

## identity_updates

Stores meaningful changes.

---

## timeline_events

Stores identity history.

---

## notifications

Stores user notifications.

---

# Application Pages

## Public

/

Landing Page

/login

/signup

---

## Protected

/overview

/moments

/moments/new

/moments/[id]

/future-selves

/reflections

/timeline

/settings

/subscription

---

# Homepage

The homepage answers:

## Who am I becoming?

Future Selves

---

## What is shaping me?

Active Moments

---

## What changed?

Identity Updates

---

## What should I do next?

Check-Ins
Identity Prompts

---

# Component System

Core Components:

* FutureCard
* MomentCard
* PathCard
* CheckInCard
* ReflectionCard
* TimelineEventCard
* CurrentSelfCard
* IdentityUpdateCard

All components must:

* Support loading states
* Support empty states
* Be reusable
* Be responsive

---

# API Routes

## Moments

POST /api/moments/create

GET /api/moments/[id]

PATCH /api/moments/[id]

---

## Paths

POST /api/paths/choose

---

## Check-Ins

POST /api/checkins/create

GET /api/checkins/[momentId]

---

## Futures

GET /api/futures

GET /api/futures/[id]

POST /api/futures/generate

---

## Current Self

GET /api/current-self

POST /api/current-self/generate

---

## Reflections

POST /api/reflections/generate

GET /api/reflections

GET /api/reflections/[id]

---

## Timeline

GET /api/timeline

---

## Notifications

GET /api/notifications

POST /api/notifications/read

---

# User Flow

## New User

Signup

↓

Create First Moment

↓

Generate Paths

↓

Choose Path

↓

Possible Futures

---

## Active User

Open App

↓

Check-In

↓

Identity Update

↓

Future Growth

---

## Reflection User

Reflection

↓

Could've Been You

↓

Still Available Today

↓

Alternate Self

---

# Business Rules

## Moments

One chosen path per moment.

Path locks after first Check-In.

---

## Check-Ins

More important than path selection.

Weight:

3x path selection.

---

## Future Selves

Can emerge.

Can grow.

Can fade.

Can return.

---

## Timeline

Immutable.

Historical record only.

---

# Monetization

## Free

* Unlimited Moments
* Unlimited Check-Ins
* Timeline
* Possible Futures
* Emerging Futures

---

## Plus

* Future Selves
* Current Self
* Reflections
* Alternate Selves
* Contradictions
* Annual Reviews

---

# Development Order

## Phase 1

Foundation

Authentication

Moments

Path Selection

---

## Phase 2

Check-Ins

Identity Updates

Homepage

---

## Phase 3

Future Selves

Current Self

Identity Engine

---

## Phase 4

Identity Prompts

Contradictions

---

## Phase 5

Reflections

Alternate Selves

---

## Phase 6

Timeline

Identity History

---

## Phase 7

Life Chapters

---

## Phase 8

Annual Reviews

---

## Phase 9

Monetization

---

## Phase 10

Production Readiness

---

# Non-Negotiable Rules

Future Paths is not:

* A social network
* A productivity app
* A habit tracker
* A life coach

Future Paths is an identity exploration platform.

Every feature must strengthen at least one question:

1. Who am I becoming?
2. Who am I today?
3. Who could I have become?
