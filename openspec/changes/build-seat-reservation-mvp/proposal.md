## Why

Build a seat reservation MVP that demonstrates a high-concurrency seat reservation system. The core engineering challenge is ensuring that limited seat inventory cannot be oversold even under extreme contention (1,000+ concurrent users). This MVP serves as a proof-of-concept for interview/demo purposes, showcasing reservation consistency, concurrency control, and system reliability using minimal infrastructure.

## What Changes

- Full-stack seat reservation application with server-rendered HTML and HTMX
- Lightweight session-based authentication (login, registration, session persistence)
- Destination selection page with seeded data: Jakarta, Semarang, Yogyakarta, and Cilegon (3 seats per destination)
- Seeder script to bootstrap destinations and seats into PostgreSQL
- Real-time seat map with 3-second HTMX polling
- Redis-based slot pool for concurrency control (semaphore pattern)
- Temporary seat holds with 5-minute TTL (automatic expiration via Redis)
- PostgreSQL-backed reservation persistence (single source of truth)
- Mock payment flow with demo card (4242 4242 4242 4242)
- Reservation confirmation with booking reference and mock QR code
- "My Bookings" page for viewing reservation history
- Stress test script to validate: exactly N successful reservations out of N seats under 1,000 concurrent users
- Docker Compose setup for PostgreSQL, Redis, and application container
- One-user-one-hold constraint (prevents inventory hoarding)
- Seat lifecycle: AVAILABLE -> HELD -> EXPIRED or RESERVED

## Capabilities

### New Capabilities
- `user-auth`: Lightweight session-based authentication with login, registration, and "stay logged in for 90 days" support
- `destination-management`: Browse and select from predefined shuttle destinations (Jakarta, Semarang, Yogyakarta, Cilegon)
- `seat-reservation`: Real-time seat map with HTMX polling, Redis-backed hold mechanism, PostgreSQL-persisted reservations, and concurrent contention handling
- `payment-simulation`: Simplified payment page with demo card, hold timer display, and simulated success/failure outcomes
- `booking-confirmation`: Post-payment confirmation with booking reference, destination, seat number, and mock QR code
- `my-bookings`: View reservation history for the authenticated user

### Modified Capabilities
<!-- No existing capabilities to modify -->

## Impact

- **Backend**: New Elysia.js routes for auth, destinations, seats, reservations, payments, and bookings
- **Database**: PostgreSQL schema for users, destinations, and reservations tables
- **Cache/Coordination**: Redis integration for session storage, seat holds, and slot pool
- **Frontend**: HTMX templates/pages for login, registration, destination selection, seat map, payment, confirmation, and my bookings
- **Infrastructure**: Docker Compose configuration with app, PostgreSQL, and Redis services
- **Testing**: Concurrent stress test script simulating 1,000 users competing for limited seats
- **Dependencies**: New npm packages for PostgreSQL client, Redis client, EJS/template engine (or Elysia HTML plugin), bcrypt (or argon2)
