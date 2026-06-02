# Non-Goals, Assumptions & Known Limitations

## Purpose

This project intentionally focuses on reservation consistency and concurrency control.

Many production concerns are deliberately simplified or excluded to keep the implementation focused on the core engineering challenge.

---

# Non-Goals

The following features are intentionally out of scope:

* OAuth providers (Google, GitHub, etc.)
* Multi-factor authentication
* Real payment gateway integration
* Email notifications
* SMS notifications
* Waitlist management
* Seat recommendation algorithms
* Kubernetes deployment
* Multi-region architecture
* Event sourcing
* Payment reconciliation systems
* Realtime seat availability

The objective is demonstrating reservation correctness rather than building a complete commercial platform.

---

# Assumption 1: Single Seat Per User

Current behavior:

* A user may hold only one seat at a time.

Example:

1. Alex reserves A2.
2. Alex attempts to reserve A3.

Result:

* Request is rejected.
* Existing hold remains active.

Reason:

This simplifies concurrency handling and prevents inventory hoarding.

Future enhancement:

* Allow atomic seat switching.

---

# Assumption 2: User Abandons Payment

Scenario:

1. Alex reserves A2.
2. Alex closes the browser.
3. Alex never returns.

Current behavior:

* Redis TTL expires after 5 minutes.
* Hold is automatically released.
* Seat becomes available again.

Benefits:

* No cleanup worker required.
* Simple implementation.

Trade-off:

* Seat remains unavailable during the hold period.

Future enhancement:

* Detect disconnects.
* Dynamic hold durations during peak demand.

---

# Assumption 3: User Changes Mind During Payment

Scenario:

1. Alex reserves A2.
2. Alex decides he prefers A3.

Current behavior:

* Existing hold remains active.
* User must cancel or allow expiration before selecting another seat.

Reason:

This avoids introducing additional race conditions.

Future enhancement:

* Atomic seat swap operation.

---

# Assumption 4: Multiple Browser Tabs

Scenario:

1. Tab 1 holds A1.
2. Tab 2 attempts A2.

Current behavior:

* Only one active hold per user.

Result:

* Additional holds are rejected.

Reason:

Prevents inventory abuse and simplifies system behavior.

---

# Assumption 5: Payment Success But Reservation Failure

Scenario:

1. Payment succeeds.
2. Reservation persistence fails.

Current behavior:

* Transaction is rolled back.
* Hold is released.
* Error is shown to the user.

Reason:

This project uses a mocked payment provider.

Future enhancement:

* Outbox pattern
* Saga orchestration
* Payment reconciliation process

---

# Limitation 1: Polling Instead of WebSockets

Current implementation:

* HTMX polling every 3 seconds

Benefits:

* Simpler implementation
* Easier debugging
* Fewer moving parts

Trade-off:

* Updates are not instantaneous
* More API calls

Future enhancement:

* WebSockets
* Server-Sent Events

---

# Limitation 2: Single Redis Instance

Current implementation:

* One Redis instance

Benefits:

* Simplicity
* Easy deployment

Trade-off:

* Single point of failure

Future enhancement:

* Redis Sentinel
* Redis Cluster

---

# Limitation 3: Single PostgreSQL Instance

Current implementation:

* One PostgreSQL instance

Benefits:

* Simpler operational model
* Strong consistency

Trade-off:

* Limited horizontal scalability

Future enhancement:

* Read replicas
* Partitioning
* Multi-region architecture

---

# Limitation 4: No Abuse Prevention (Cancel Cycling)

Current implementation:

* No rate limiting or blacklist for repeated reserve-and-cancel behavior
* A user can hold a seat, cancel it immediately, and re-hold repeatedly

Scenario:

1. Alex reserves A1.
2. Alex cancels A1 immediately.
3. Alex reserves A1 again.
4. Repeat indefinitely.

Risk:

* Malicious users can disrupt availability by rapidly cycling seats
* Legitimate users see seats flicker between available and held
* No mechanism to detect or penalize the pattern

Future enhancement:

* Rate limit on `/seats/:id/hold` and `/seats/:id/release` per user (e.g., max 5 holds per minute)
* Cool-down period after cancellation before the same user can re-hold the same seat
* Blacklist users exceeding thresholds, with manual review process

---

# Limitation 5: No Queue or Waitlist

Current implementation:

* If all seats are held or reserved, users receive "Sorry, seat is no longer available."
* No mechanism to notify users when a seat becomes available

Scenario:

1. All 3 seats for Yogyakarta are held by Alex, Ben, and Cindy.
2. Diana tries to reserve — rejected immediately.
3. If Alex's hold expires, Diana has no way of knowing unless she keeps polling manually.

Risk:

* Lost opportunity — seats that become available may not be claimed quickly
* Poor user experience — users must manually refresh to check availability
* No fairness guarantee — the next user to poll after a release wins, not the user who has been waiting longest

Future enhancement:

* Virtual waitlist with position tracking
* Push notification or email when a seat becomes available
* Time-based priority (first to join waitlist gets first claim on next available seat)

---

# Limitation 6: Single-Seat Reservation Limit Under Load

Current behavior:

* A user may hold only one seat at a time.

While this simplifies concurrency, it introduces a specific limitation under load:

Scenario:

1. Destination Yogyakarta has 3 seats: A1, A2, A3.
2. Alex reserves A1.
3. Ben reserves A2.
4. Cindy reserves A3.
5. All 3 seats are now held by different users.
6. No other user can reserve any seat until one of the holds expires or is cancelled.

Impact:

* Even if Diana is a legitimate customer trying to book for her family of 4, she can only reserve 1 seat at a time.
* Group booking is not supported in the current model.
* Total system throughput is capped by the number of seats × hold duration (e.g., 3 seats × 5 min hold = at most 3 reservations per 5 minutes).

Future enhancement:

* Allow bulk holds for group bookings (e.g., hold 4 seats simultaneously for a single user)
* Dynamic hold duration based on demand (shorter holds during peak periods)
* Queue + batch processing (collect intent, then process in waves)

---

# What This Project Proves

This project is successful if:

* Seats cannot be oversold
* Concurrent requests remain consistent
* Holds expire automatically
* PostgreSQL remains the source of truth
* Stress tests validate behavior under contention

The project intentionally prioritizes correctness and simplicity over feature completeness.
