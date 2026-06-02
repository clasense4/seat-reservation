# Architecture & Trade-offs

## Overview

This project demonstrates a high-contention seat reservation system built using:

* Bun
* Elysia.js
* PostgreSQL
* Redis
* HTMX
* Docker Compose

The primary goal is to prevent overselling while maintaining a simple and understandable architecture.

---

# High-Level Architecture

```text
Browser (HTML + HTMX)
            |
            v
      Bun + Elysia
            |
    +-------+-------+
    |               |
    v               v
 PostgreSQL      Redis
(Source of      (Slot Pool,
 Truth)         Holds, TTL)
```

---

# Why Bun + Elysia?

## Benefits

* TypeScript-first development
* Very fast startup time
* Minimal framework overhead
* No separate build step during development
* Lightweight deployment model

## Trade-offs

* Smaller ecosystem than Node.js
* Less community content available
* Some libraries assume Node.js runtime

## Decision

The interviewer specifically requested a TypeScript framework. Elysia provides a modern TypeScript experience while keeping the codebase small and easy to reason about.

---

# Why HTMX Instead of React?

## Benefits

* Extremely small frontend footprint
* Server-driven UI
* Minimal JavaScript
* Faster development
* Easier demonstration of backend concepts

## Trade-offs

* Less interactive than SPA frameworks
* Polling instead of client-side state management
* Limited frontend ecosystem

## Decision

The goal of this project is demonstrating reservation consistency rather than frontend architecture.

HTMX allows the project to focus on concurrency, transactions, and system reliability.

---

# Why PostgreSQL?

## Benefits

* ACID transactions
* Reliable data persistence
* Strong consistency guarantees
* Mature and battle-tested

## Trade-offs

* More lock contention under heavy writes
* Horizontal scaling is more complex

## Decision

Confirmed reservations must never be lost or duplicated.

Consistency is prioritized over maximum throughput.

PostgreSQL remains the single source of truth.

---

# SERIAL vs UUID for Primary Keys

**Current state:** All tables (`users`, `destinations`, `seats`, `reservations`) use `SERIAL PRIMARY KEY` — auto-incrementing integers.

**Production consideration:** Switch to UUID v4 or UUID v7 for primary keys.

## Comparison

| Aspect | SERIAL (Integer) | UUID v4 (Random) | UUID v7 (Time-Ordered) |
|---|---|---|---|
| **Format** | 1, 2, 3, ... | `550e8400-e29b-41d4-a716-446655440000` | `018f3a6e-1234-7abc-bb61-2c4b8c2d6e8a` |
| **Storage** | 4 bytes | 16 bytes | 16 bytes |
| **Readability** | Human-friendly (short, sequential) | Opaque (long string) | Opaque but time-sortable within the same millisecond |
| **Index performance** | Excellent — B-tree inserts are always appended at the right edge | Poor — random inserts cause page splits and index bloat | **Good** — time-ordered prefix keeps new inserts mostly sequential |
| **Security** | Predictable — competitors can infer total users, seats, or reservation volume by observing IDs | **Unpredictable** — no information leakage | **Unpredictable** — no sequential enumeration (only coarse timestamp is exposed) |
| **Distributed ready** | Requires central sequence (conflict on multi-master) | **No coordination** — any node can generate IDs independently | **No coordination** — same as v4, but also sortable |
| **URL exposure** | `/destinations/3/seats` — sequential guessing is trivial | `/destinations/550e8400/seats` — no guessing | Same as v4 |
| **Complexity** | None (built-in) | Needs `gen_random_uuid()` in Postgres or `crypto.randomUUID()` in the application | Requires Postgres extension (`pg_uuidv7`) or application-level generation |

## Decision (MVP)

SERIAL is used in the current MVP because:

1. **Simplicity** — no need for UUID generation logic, no extension dependencies, no storage overhead concerns.
2. **Local scope** — the system runs on a single database instance, so no distributed ID coordination is needed.
3. **Predictability is not a threat** — destination IDs (1–4) are public by design (they appear in seed data and URLs). Seat IDs are never exposed to end users beyond the seat map rendering.

## Recommendation (Production)

Switch to **UUID v7** for all primary keys when moving to production:

- Use the `pg_uuidv7` PostgreSQL extension to generate time-ordered UUIDs at the database level, or generate them in the application layer using a library.
- UUID v7 avoids the index bloat problem of UUID v4 while retaining the security benefit (no sequential enumeration).
- Externally-facing IDs (booking references, payment IDs) should already be separate opaque strings — UUIDs make all IDs opaque by default.
- For Redis hold keys, keep using `hold:<seatId>` — the key format is internal and short. The mapping between UUID and Redis key is a simple string conversion.

---

# Why Redis?

## Benefits

* Extremely fast operations
* Native key expiration (TTL)
* Ideal for temporary state
* Useful for concurrency control

## Responsibilities

Redis is used for:

* Seat holds
* Slot Pool / Semaphore management
* Temporary reservation state
* Session storage

Redis is NOT the source of truth.

## Trade-offs

* Additional infrastructure component
* Temporary data loss possible if Redis fails

## Decision

Redis acts as a high-speed coordination layer while PostgreSQL stores all durable business data.

---

# Why Lua Scripts Instead of TypeScript Redis Commands?

The seat hold operation requires an atomic **check-and-set**: verify the seat is free AND the user isn't already holding another seat, then set both keys. A naive approach using plain Redis commands has a race window between the read and write.

## Option A: WATCH + MULTI (Optimistic Locking)

```typescript
await redis.watch(`hold:${seatId}`, `userhold:${userId}`);

const [userHold, seatHold] = await Promise.all([
  redis.get(`userhold:${userId}`),
  redis.get(`hold:${seatId}`),
]);

if (userHold || seatHold) {
  await redis.unwatch();
  return { success: false };
}

const result = await redis
  .multi()
  .setex(`hold:${seatId}`, ttl, userId)
  .setex(`userhold:${userId}`, ttl, seatId)
  .exec();

if (result === null) {
  // WATCH triggered — keys changed during check, must retry
  // Requires a loop that may spin indefinitely under contention
}
```

This approach works in low-contention scenarios but breaks down at scale.

## Option B: Lua Script (Atomic Server-Side)

```lua
local userHold = redis.call('get', 'userhold:' .. KEYS[2])
if userHold then return {err='Already holding'} end

local seatHold = redis.call('get', 'hold:' .. KEYS[1])
if seatHold then return {err='Seat taken'} end

redis.call('setex', 'hold:' .. KEYS[1], ARGV[1], KEYS[2])
redis.call('setex', 'userhold:' .. KEYS[2], ARGV[1], KEYS[1])
return {ok='success'}
```

A single round-trip — Redis executes the entire script atomically, with no race window.

## Comparison

| Aspect | WATCH / MULTI (TypeScript) | Lua Script |
|---|---|---|
| **Round trips** | 3+ (WATCH, GET+GET, MULTI/EXEC + retries) | **1** |
| **Race condition** | Needs retry loop when WATCH fires | **None — atomic by design** |
| **Performance under 1,000x contention** | Degrades — most EXEC calls fail, each retry restarts the cycle | **Stable — always succeeds or fails in one shot** |
| **Code complexity** | Retry loop, edge cases, connection state management | **Single script, no branching** |
| **Readability** | TypeScript — familiar syntax | Lua — less well-known |
| **Error handling** | Must parse null result, distinguish watch failure from no-op | **Return value directly encodes success/error** |

## Decision

Lua scripts were chosen because correctness under extreme contention (1,000 users fighting for 3 seats) is the core engineering challenge of this project. The extra readability cost of embedding Lua in TypeScript strings is outweighed by guaranteed atomicity and stable performance without retry complexity.

**Reference:** [Redis documentation — Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/) states: *"Redis guarantees the script's atomic execution. While executing the script, all server activities are blocked during its entire runtime. These semantics mean that all of the script's effects either have yet to happen or had already happened."*

# Slot Pool Design

When users attempt to reserve seats:

1. Redis Slot Pool controls available reservation capacity.
2. Successful claims obtain a temporary hold.
3. Failed claims are rejected immediately.
4. Confirmed reservations are written to PostgreSQL.

Benefits:

* Reduces database contention
* Rejects impossible reservations early
* Prevents excessive write load

---

# Reservation Lifecycle

```text
AVAILABLE
    |
    v
HELD
    |
    +------> EXPIRED
    |
    v
RESERVED
```

AVAILABLE

* Seat is free

HELD

* User has temporary ownership
* Redis TTL countdown active

EXPIRED

* Redis automatically releases hold
* Seat becomes available again

RESERVED

* Payment completed
* Persisted in PostgreSQL

---

# Real-Time Updates

The seat map refreshes every 3 seconds using HTMX polling.

Benefits:

* Simpler implementation
* Easier debugging
* No websocket infrastructure

Trade-off:

* Slightly higher request volume
* Updates are near real-time rather than instant

This trade-off is acceptable for an interview project.

---

# Deployment Strategy

Docker Compose is used for:

* Application container
* PostgreSQL container
* Redis container

Benefits:

* One-command startup
* Consistent local environment
* Easy reviewer setup

Trade-off:

* Not production orchestration

Production systems would typically use Kubernetes or managed cloud services.

---

# Reliability Validation

The project includes a stress test that simulates:

* 1,000 concurrent users
* 3 available seats

Expected outcome:

* Exactly 3 successful reservations
* 997 rejected attempts
* Zero double-booking incidents

This stress test serves as proof that the reservation mechanism maintains consistency under heavy contention.
