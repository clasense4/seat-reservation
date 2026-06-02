## 1. Project Setup & Infrastructure

- [x] 1.1 Add project dependencies: PostgreSQL client, Redis client, HTMX Elysia plugin, template engine, password hashing
- [x] 1.2 Create Docker Compose file for app, PostgreSQL, and Redis services
- [x] 1.3 Add database initialization script with schema: users, destinations, reservations tables
- [x] 1.4 Create seeder script that inserts 4 destinations (Jakarta, Semarang, Yogyakarta, Cilegon), each with 3 seats (A1, A2, A3)
- [x] 1.5 Create Redis client utility module with connection management

## 2. Authentication (user-auth)

- [x] 2.1 Create user registration endpoint (POST /register) with email + password, password hashing, and duplicate email check
- [x] 2.2 Create registration page (HTML + HTMX form)
- [x] 2.3 Create user login endpoint (POST /login) with credential validation and Redis session creation (24h default, 90d for persistent)
- [x] 2.4 Create login page with "stay logged in for 90 days" checkbox
- [x] 2.5 Create logout endpoint (POST /logout) to invalidate session
- [x] 2.6 Add session middleware to protect routes and attach user context

## 3. Destination Management

- [x] 3.1 Create destination listing endpoint (GET /destinations) for authenticated users
- [x] 3.2 Create destination selection page with HTMX and styled destination cards
- [x] 3.3 Add route redirect: authenticated root -> /destinations, unauthenticated -> /login

## 4. Seat Reservation System (seat-reservation)

- [x] 4.1 Initialize Redis slot pool on startup: populate destination seat counts based on PostgreSQL confirmed reservations
- [x] 4.2 Create seat map endpoint (GET /destinations/:id/seats) returning current seat states (available/held/reserved) with 3-second HTMX polling
- [x] 4.3 Create seat map page with HTMX polling (every 3s) for live updates
- [x] 4.4 Implement seat hold endpoint (POST /seats/:id/hold) with:
      - Redis slot pool semaphore check (atomic decrement)
      - One-hold-per-user validation
      - Redis hold with 5-minute TTL
      - Seat state rendering (green=available, gray=held/reserved, blue=held-by-me)
- [x] 4.5 Implement manual hold release endpoint (POST /seats/:id/release)
- [x] 4.6 Handle hold expiration: Redis TTL automatically releases hold; slot pool must atomically increment counter on TTL
- [x] 4.7 Add concurrent reservation protection using Redis Lua scripts for atomic slot pool operations

## 5. Payment Simulation (payment-simulation)

- [x] 5.1 Create payment page endpoint (GET /payment) showing destination, seat number, price, and remaining hold time
- [x] 5.2 Create payment page (HTML form) with card input and hold timer display
- [x] 5.3 Implement payment processing endpoint (POST /payment) with:
      - Demo card (4242 4242 4242 4242) -> success
      - Any other card -> failure with hold release
      - Expired hold -> error + redirect to seat map

## 6. Booking Confirmation & My Bookings

- [x] 6.1 Implement reservation persistence in PostgreSQL after successful payment (INSERT into reservations table)
- [x] 6.2 Generate unique booking reference for each confirmed reservation
- [x] 6.3 Create confirmation page with booking reference, destination, seat number, and mock QR code
- [x] 6.4 Create "My Bookings" endpoint (GET /bookings) listing all reservations for authenticated user
- [x] 6.5 Create "My Bookings" page with empty state handling

## 7. Navigation & Layout

- [x] 7.1 Add navigation bar to all pages: logout button, "My Bookings" link
- [x] 7.2 Wire up HTMX for all form submissions and dynamic updates
- [x] 7.3 Add basic CSS styling for clean, mobile-friendly interface

## 8. Stress Test & Validation

- [x] 8.1 Create stress test script that simulates N concurrent users competing for M available seats
- [x] 8.2 Verify stress test: exactly M successful holds out of N concurrent attempts with zero double-bookings *(requires running infrastructure)*
- [x] 8.3 Run full integration test: register -> login -> select destination -> hold seat -> pay -> confirm -> verify in bookings *(requires running infrastructure)*

## 9. Final Polish

- [x] 9.1 Review and fix any error handling gaps (edge cases, error messages)
- [x] 9.2 Add documentation: update README with setup, run, and test instructions
- [x] 9.3 Verify Docker Compose one-command startup works end-to-end *(requires Docker)*
