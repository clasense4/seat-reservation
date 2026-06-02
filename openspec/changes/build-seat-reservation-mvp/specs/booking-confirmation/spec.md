## ADDED Requirements

### Requirement: Display confirmation details
The system SHALL display a confirmation page after successful payment with all reservation details.

#### Scenario: View confirmation page
- **WHEN** a user successfully completes payment
- **THEN** the system displays a confirmation page with the booking reference, destination, seat number, and a mock QR code

### Requirement: Success message
The system SHALL display a clear success message on the confirmation page.

#### Scenario: Confirmation message
- **WHEN** a user lands on the confirmation page
- **THEN** the system displays the message: "Seat {seatNumber} successfully reserved."

### Requirement: Persist reservation
The system SHALL persist the confirmed reservation in PostgreSQL before showing the confirmation page.

#### Scenario: Reservation persisted
- **WHEN** payment is successfully processed
- **THEN** the reservation is saved to PostgreSQL and the seat status becomes RESERVED
