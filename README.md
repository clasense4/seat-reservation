# Seat Reservation MVP

High-concurrency seat reservation system built with **Bun**, **Elysia.js**, **PostgreSQL**, **Redis**, **HTMX**, and **Docker Compose**.

The core engineering challenge is ensuring that a limited number of seats cannot be oversold, even when hundreds or thousands of users attempt to reserve them simultaneously.

**Demo**
<div align="center">
   
https://github.com/user-attachments/assets/60521a73-a4b4-442e-b84c-f1e541c3e233

</div>

---

## Architecture

```
Browser (HTML + HTMX)
            |
            v
      Bun + Elysia
            |
    +-------+-------+
    |               |
    v               v
  PostgreSQL      Redis
 (Source of      (Seat Holds,
  Truth)         Sessions)
```

- **Bun + Elysia**: TypeScript-first API with server-rendered HTML
- **HTMX**: Real-time seat map updates via 3-second polling (zero SPA complexity)
- **PostgreSQL**: Single source of truth for confirmed reservations
- **Redis**: Temporary seat holds with TTL-based auto-expiration, Redis-backed sessions
- **Concurrency Control**: Lua scripts for atomic SETNX seat holds (guarantees no double-booking)

---

## Quick Start (Docker Compose)

The fastest way to get started:

```bash
# 1. Start PostgreSQL, Redis, and the application
docker compose up --build

# 2. In a new terminal, seed the database with destinations and seats
docker compose exec app bun run seed

# 3. Open http://localhost:3000 in your browser
```

The application will be available at **http://localhost:3000**.

> **Reset from scratch:** To wipe all data (PostgreSQL volumes, Redis volumes, seed data) and start fresh:
> ```bash
> docker compose down -v
> docker compose up --build
> docker compose exec app bun run seed
> ```
> The `-v` flag removes the named volumes (`postgres_data`, `redis_data`), clearing all reservations, users, and sessions. Useful after running stress tests or when you want a clean slate.

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL >= 15
- Redis >= 7

### Install Dependencies

```bash
bun install
```

### Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

OR set env vars directly:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/seat_reservation
REDIS_URL=redis://localhost:6379
PORT=3000
```

### Database Setup

```bash
# 1. Create the database and run migrations
docker compose up postgres redis

# 2. Seed destinations and seats
bun run seed
```

### Run the Server

```bash
# Development (hot reload)
bun run dev

# Production
bun run src/index.tsx
```

The server will start at http://localhost:3000.

---

## Testing

### Integration Test (Full User Flow)

Tests the complete reservation journey:
`register -> login -> select destination -> hold seat -> pay -> confirm -> verify in bookings`

```bash
# Ensure the server is running locally first
bun run dev

# In another terminal
bun run test:integration
```

### Stress Test (Concurrency Validation)

Simulates 1,000 concurrent users competing for 3 available seats. Validates:
- Exactly 3 successful reservations
- 997 rejected attempts
- Zero double-booking incidents

```bash
# Ensure the server is running locally first
bun run dev

# In another terminal
bun run test:stress
```

---

## Project Structure

```
.
├── db/
│   ├── init.sql          # Database schema
│   └── seed.ts           # Seeder (4 destinations, 3 seats each)
├── src/
│   ├── index.tsx         # Main application entry
│   ├── config.ts         # Environment configuration
│   ├── db.ts             # PostgreSQL client
│   ├── redis.ts          # Redis client
│   ├── auth.tsx          # Authentication routes + session middleware
│   ├── destinations.tsx  # Destination listing
│   ├── seats.tsx         # Seat reservation core (hold/release/Lua scripts)
│   ├── payment.tsx       # Mock payment flow
│   ├── bookings.tsx      # My Bookings page
│   └── views/            # JSX page components
│       ├── layout.tsx
│       ├── login.tsx
│       ├── register.tsx
│       ├── destinations.tsx
│       ├── seat-map.tsx
│       ├── payment.tsx
│       ├── confirmation.tsx
│       └── bookings.tsx
├── tests/
│   ├── stress-test.ts    # Concurrent user simulation
│   └── integration-test.ts
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Key Features

- **Lightweight Authentication**: Session-based login/registration with "remember me" (90 days)
- **Real-Time Seat Map**: HTMX polling with 3-second refresh showing available (green), held (gray), held-by-me (blue), and reserved states
- **Concurrent Protection**: Lua scripts guarantee atomic seat holds — exactly 1 user succeeds even under extreme contention
- **Hold Expiration**: Redis TTL automatically releases holds after 5 minutes (no background worker needed)
- **One-Hold-Per-User Constraint**: Prevents inventory hoarding and simplifies concurrency
- **Mock Payment**: Demo card `4242 4242 4242 4242` simulates success; any other input simulates failure
- **Confirmation**: Booking reference, destination, seat, and mock QR code

---

## Assumptions & Limitations

- A user may hold only **one seat at a time**
- If a user abandons checkout, the hold auto-expires after 5 minutes
- Seat map updates are **near real-time** (3-second polling), not instantaneous
- Payment gateway is **mocked** — no real financial transactions
- Multi-seat booking and seat switching are not supported (MVP scope)

---

## Further Reading

This project includes detailed documents covering the design decisions, user experience, and scope boundaries:

### [UX Narrative](./ux-narrative.md)

Walks through the complete user journey — from login through reservation, payment, and confirmation. Follows Alex, a traveler reserving a shuttle seat across four destinations (Jakarta, Semarang, Yogyakarta, Cilegon). Also covers concurrency protection, hold expiration behavior, and the payment flow from the user's perspective.

### [Architecture & Trade-offs](./architecture-and-trade-offs.md)

Explains every technology choice: why Bun + Elysia over Node.js, why HTMX over React, why Redis for temporary holds alongside PostgreSQL as the source of truth. Covers the slot pool design, reservation lifecycle (available → held → expired/reserved), and the real-time polling strategy.

### [Non-Goals & Known Limitations](./non-goals.md)

Documents what this project intentionally does **not** do — no OAuth, no real payments, no WebSockets, no Kubernetes, no waitlists. Also lists key assumptions (one hold per user, hold auto-expiry, no multi-tab coordination) and their rationale.

### [Production Roadmap](./production-roadmap.md)

Outlines the path from MVP to production: federated auth (Cognito / Okta / Keycloak), real payments (Stripe), AWS infrastructure (EC2/ECS/EKS + RDS + ElastiCache), and Cloudflare DDoS + rate limiting. Includes migration trade-off tables and recommended phase ordering.

---

## License

MIT
