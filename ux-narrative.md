# UX Narrative

## Project Goal

This project demonstrates a high-concurrency seat reservation system built with Bun, Elysia, PostgreSQL, Redis, HTMX, and Docker Compose.

The primary engineering challenge is ensuring that a limited number of seats cannot be oversold, even when hundreds or thousands of users attempt to reserve them simultaneously.

Authentication and payment flows are intentionally simplified so the project can focus on reservation consistency, concurrency control, and system reliability.

---

# User Persona

Alex is a traveler in Bandung who wants to reserve a shuttle seat for an upcoming trip.

Available destinations:

* Jakarta
* Semarang
* Yogyakarta
* Cilegon

Each destination has a limited seat inventory.

---

# User Flow

## 1. Landing & Authentication

Alex opens:

http://localhost:3000

He sees:

* Login form
* Registration form
* "Stay logged in for 90 days" checkbox

Authentication is intentionally lightweight and session-based.

After login, Alex is redirected to the destination selection page.

He sees:

**Choose Destination**

* Jakarta
* Semarang
* Yogyakarta
* Cilegon

After selecting a destination, he enters the seat reservation page.

---

## 2. Real-Time Seat Reservation

Alex sees:

**Seat Reservation — 3 Seats Available**

Simple seat map:

* A1
* A2
* A3

Seat states:

* Green → Available
* Gray → Reserved or Held
* Blue → Held by Me

The page automatically refreshes every 3 seconds using HTMX polling.

Alex clicks A2.

Immediately:

* A2 becomes blue
* Countdown timer starts
* Message appears:

"Seat A2 is reserved for you for 5 minutes."

Other users see A2 become unavailable on their next refresh.

### Concurrent Reservation Protection

If 1,000 users attempt to reserve the same seat simultaneously:

* Redis Slot Pool acts as a semaphore
* Only one user successfully obtains the reservation slot
* Remaining users receive:

"Sorry, seat is no longer available."

This prevents double booking before any database write occurs.

---

## 3. Payment Simulation

Alex clicks:

"Continue to Payment"

He sees:

* Destination
* Seat Number
* Price
* Remaining hold time

A simplified payment form is shown.

Supported demo card:

4242 4242 4242 4242

This payment page is intentionally mocked.

The goal is to demonstrate reservation lifecycle management rather than payment gateway integration.

Possible outcomes:

**Successful Payment**

> Reservation proceeds.

**Failed Payment**

> The seat hold is released immediately.

**Hold Expired**

> Redis automatically expires the hold.

The seat becomes available again for other users.

No background worker is required.

---

## 4. Reservation Confirmation

After successful payment:

* Reservation is persisted in PostgreSQL
* Seat status becomes RESERVED
* Confirmation page appears

Alex receives:

* Booking Reference
* Destination
* Seat Number
* Mock QR Code

Message:

"Seat A2 successfully reserved."

The reservation can later be viewed under:

"My Bookings"

---

# User Experience Summary

The application remains fast and responsive while using only server-rendered HTML and HTMX.

Benefits:

* Minimal JavaScript
* Mobile-friendly interface
* Real-time seat updates
* Clear error handling
* Simple deployment
* Predictable user experience

---

# Engineering Highlights

## Bun + Elysia

Chosen because:

* TypeScript-first development experience
* Minimal setup
* Fast startup time
* No separate build step required during development

## HTMX

Chosen because:

* Server-driven UI
* Minimal frontend complexity
* Real-time updates without SPA frameworks

## Redis

Used for:

* Slot Pool / Semaphore management
* Temporary seat holds
* Automatic expiration via TTL

Redis is NOT the source of truth.

## PostgreSQL

Used for:

* Reservation records
* User accounts
* Booking history

PostgreSQL remains the single source of truth for all confirmed reservations.

## Reliability Demonstration

The project includes a stress test that simulates:

* 1,000 concurrent users
* 3 available seats

Expected result:

* Exactly 3 successful reservations
* 997 rejected attempts
* Zero double bookings

The stress test serves as proof that the reservation system maintains consistency under extreme contention.
