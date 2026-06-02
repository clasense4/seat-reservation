## ADDED Requirements

### Requirement: Display payment summary
The system SHALL display a payment summary to the user before they enter payment details.

#### Scenario: View payment page
- **WHEN** an authenticated user with an active hold navigates to the payment page
- **THEN** the system displays the destination, seat number, price, and remaining hold time

### Requirement: Process mock payment
The system SHALL accept a simplified payment form and simulate payment processing using a demo card.

#### Scenario: Successful payment with demo card
- **WHEN** a user enters the demo card number 4242 4242 4242 4242 and submits the form
- **THEN** the system processes the mock payment successfully and proceeds to confirmation

#### Scenario: Failed payment with invalid card
- **WHEN** a user enters any card number other than the demo card and submits the form
- **THEN** the system simulates a payment failure, releases the seat hold immediately, and displays an error message

### Requirement: Handle expired hold during payment
The system SHALL reject payment attempts if the seat hold has expired.

#### Scenario: Payment after hold expired
- **WHEN** a user attempts to pay after the 5-minute hold has expired
- **THEN** the system displays an error message stating the hold has expired and redirects to the seat map
