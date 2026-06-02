## ADDED Requirements

### Requirement: List user reservations
The system SHALL display a list of all reservations made by the authenticated user.

#### Scenario: View my bookings
- **WHEN** an authenticated user navigates to the "My Bookings" page
- **THEN** the system displays all their reservations with booking reference, destination, seat number, and reservation date

### Requirement: Show empty state
The system SHALL display an appropriate message when the user has no reservations.

#### Scenario: No bookings
- **WHEN** an authenticated user with no reservations navigates to the "My Bookings" page
- **THEN** the system displays a message such as "You have no reservations yet."
