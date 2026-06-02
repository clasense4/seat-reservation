## ADDED Requirements

### Requirement: View seat map
The system SHALL display a real-time seat map for the selected destination, showing available, held, and reserved seats.

#### Scenario: Load seat map
- **WHEN** an authenticated user navigates to the seat reservation page for a destination
- **THEN** the system displays the seat map with each seat shown in its current state

#### Scenario: Real-time updates via polling
- **WHEN** the seat map page is open
- **THEN** the system SHALL refresh the seat map every 3 seconds using HTMX polling

### Requirement: Hold seat
The system SHALL allow an authenticated user to hold an available seat for 5 minutes.

#### Scenario: Successful seat hold
- **WHEN** an authenticated user clicks an available seat and no slot pool contention occurs
- **THEN** the seat becomes held by that user, a 5-minute countdown begins, and other users see the seat as unavailable

#### Scenario: Reject hold when user already holds another seat
- **WHEN** an authenticated user who already holds a seat attempts to hold a different seat
- **THEN** the system rejects the request and the existing hold remains active

#### Scenario: Reject hold when seat is unavailable
- **WHEN** an authenticated user clicks a seat that is already held or reserved
- **THEN** the system displays an error message: "Sorry, seat is no longer available."

### Requirement: Concurrent reservation protection
The system SHALL guarantee that exactly one user can successfully hold a given seat even under extreme concurrent contention.

#### Scenario: 1,000 users compete for 3 seats
- **WHEN** 1,000 concurrent users attempt to reserve from 3 available seats
- **THEN** exactly 3 users obtain holds, 997 are rejected, and zero double-bookings occur

### Requirement: Automatic hold expiration
The system SHALL automatically release a seat hold after 5 minutes if the user does not complete payment.

#### Scenario: Hold expires naturally
- **WHEN** 5 minutes elapse after a seat hold without payment
- **THEN** Redis automatically expires the hold and the seat becomes available again

### Requirement: Release hold manually
The system SHALL allow a user to voluntarily release their active hold.

#### Scenario: User releases hold
- **WHEN** an authenticated user with an active hold clicks to release it
- **THEN** the hold is immediately released and the seat becomes available again

### Requirement: PostgreSQL as source of truth
The system SHALL persist confirmed reservations to PostgreSQL.

#### Scenario: Reservation confirmed
- **WHEN** a user successfully completes payment for a held seat
- **THEN** the reservation is written to PostgreSQL with destination, seat number, user ID, and timestamp
