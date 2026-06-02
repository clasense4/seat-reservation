## Context

This project starts from a minimal Elysia.js "Hello Elysia" scaffold. The goal is to build a complete seat reservation MVP that demonstrates high-concurrency seat reservation consistency. The primary engineering challenge is preventing overselling of limited seat inventory when hundreds or thousands of users attempt to reserve simultaneously.

The architecture uses Bun + Elysia.js for the application server, PostgreSQL as the single source of truth for all durable data, Redis for temporary coordination (seat holds, slot pool, sessions), HTMX for real-time UI updates via polling, and Docker Compose for local deployment.

Authentication and payment are intentionally mocked/simplified so the project can focus on reservation correctness and concurrency control.

## Goals / Non-Goals

**Goals:**
- Implement lightweight session-based authentication (registration, login, 90-day persistent sessions)
- Provide destination selection (Jakarta, Semarang, Yogyakarta, Cilegon)
- Implement real-time seat reservation with Redis-backed slot pool (semaphore) for concurrency control
- Ensure exactly one user can hold a seat at a time; reject all other concurrent attempts
- Implement automatic seat hold expiration via Redis TTL (5 minutes)
- Implement mock payment flow with success/failure outcomes
- Persist confirmed reservations to PostgreSQL as the single source of truth
- Provide reservation confirmation with booking reference and mock QR code
- Provide "My Bookings" page for reservation history
- Include stress test that validates exactly N successful reservations from N seats under 1,000 concurrent users
- Deliver Docker Compose setup for one-command local startup

**Non-Goals:**
- OAuth providers, multi-factor authentication, or production-grade identity management
- Real payment gateway integration (Stripe, etc.)
- Email/SMS notifications
- Waitlist management or seat recommendation algorithms
- WebSockets or Server-Sent Events (HTMX polling is sufficient)
- Kubernetes or multi-region deployment
- Background workers (hold expiration is handled by Redis TTL)
- Real-time seat availability with sub-second latency
- Multi-seat booking per user (one seat per user constraint)
- Seat switching / atomic swaps after hold

## Decisions

### 1. HTMX + Server-Side Rendering over React/SPA
- **Rationale**: The project focuses on demonstrating backend concurrency and consistency, not frontend architecture. HTMX enables real-time updates with 3-second polling, requires minimal JavaScript, and keeps the codebase small and easy to reason about.
- **Alternatives considered**: React/Vue SPA — rejected because it adds unnecessary frontend complexity and build steps.

### 2. Redis as Coordination Layer (NOT Source of Truth)
- **Rationale**: Redis provides extremely fast in-memory operations, native key expiration (TTL), and is ideal for temporary state like seat holds and slot pool semaphores. Using Redis for coordination reduces database contention by rejecting impossible reservations before touching PostgreSQL.
- **Alternatives considered**: PostgreSQL advisory locks or SELECT FOR UPDATE — rejected because they increase database contention under heavy load.
- **Trade-off**: If Redis fails, temporary holds are lost, but PostgreSQL retains all confirmed reservations.

### 3. PostgreSQL as Single Source of Truth
- **Rationale**: Confirmed reservations must never be lost or duplicated. PostgreSQL provides ACID transactions, strong consistency guarantees, and reliable persistence. All durable business data (users, destinations, reservations) lives here.
- **Trade-off**: More lock contention under heavy writes compared to NoSQL, but consistency is prioritized.

### 4. Slot Pool / Semaphore Pattern for Concurrency Control
- **Rationale**: Before attempting to reserve a seat, the system attempts to claim a slot from a Redis-based pool. Only one concurrent request succeeds per slot. This prevents double-booking before any database write occurs and dramatically reduces write contention on PostgreSQL.
- **Implementation**: Each destination has a fixed number of seats. A Redis key per destination tracks available reservation capacity. Claiming a seat decrements the counter; releasing (expiration or failure) increments it.

### 5. One User, One Hold Constraint
- **Rationale**: A user may hold only one seat at a time. If a user attempts to hold a second seat while already holding one, the request is rejected. This simplifies concurrency handling and prevents inventory hoarding.
- **Trade-off**: Users cannot reserve multiple seats or switch seats without releasing the current hold first.

### 6. No Background Worker for Hold Expiration
- **Rationale**: Redis TTL automatically releases expired holds. When a hold expires, the seat becomes available again. This eliminates the need for a cron job or background worker, keeping the architecture simpler.
- **Trade-off**: There is a brief delay between Redis TTL expiration and the slot pool counter being incremented if not handled atomically. The implementation must use Redis Lua scripts or atomic operations (e.g., `EVAL` or Redis transactions) to ensure the counter is always consistent.

### 7. Mock Payment with Deterministic Demo Card
- **Rationale**: The goal is demonstrating reservation lifecycle management, not payment gateway integration. A single demo card (4242 4242 4242 4242) is hardcoded to simulate success; any other input simulates failure.
- **Trade-off**: No real financial transactions; payment failure handling is simplified.

### 8. Session-Based Authentication Over JWT
- **Rationale**: Session-based authentication with Redis-backed sessions is simpler to implement and revoke. The "stay logged in for 90 days" checkbox controls session TTL in Redis.
- **Alternatives considered**: JWT — rejected because it adds token refresh complexity and revocation is harder without a denylist (which essentially becomes session storage).

## Risks / Trade-offs

- **[Risk] Polling creates higher request volume than WebSockets** → **Mitigation**: 3-second polling interval is acceptable for an MVP/demo. Mention as a known limitation.
- **[Risk] Single Redis instance is a single point of failure for holds** → **Mitigation**: Redis is NOT the source of truth. If Redis restarts, only temporary holds are lost; confirmed reservations remain safe in PostgreSQL. Seats will revert to available.
- **[Risk] Redis and PostgreSQL state can drift if slot pool is not carefully managed** → **Mitigation**: Use Redis atomic operations (Lua scripts or `WATCH`/`MULTI`/`EXEC`) for slot pool changes. On application startup, reconcile slot pool with actual confirmed reservations in PostgreSQL.
- **[Risk] Bun + Elysia ecosystem is smaller than Node.js + Express** → **Mitigation**: The project uses well-supported libraries (PostgreSQL, Redis, HTMX). Elysia is mature enough for this scope.
- **[Risk] One-user-one-hold may frustrate users who want to book multiple seats** → **Mitigation**: Document as intentional MVP constraint; future enhancement could allow multiple seats.
- **[Risk] Mock payment does not handle edge cases like network timeouts** → **Mitigation**: Acceptable for demo. Document as non-goal.
- **[Risk] Seat map polling shows stale data for up to 3 seconds** → **Mitigation**: Acceptable trade-off for simpler architecture. Documented in non-goals.
