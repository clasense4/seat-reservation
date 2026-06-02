## ADDED Requirements

### Requirement: List destinations
The system SHALL display all available shuttle destinations to authenticated users.

#### Scenario: View destinations
- **WHEN** an authenticated user navigates to the destination selection page
- **THEN** the system displays a list of destinations: Jakarta, Semarang, Yogyakarta, and Cilegon

### Requirement: Select destination
The system SHALL allow an authenticated user to select a destination to proceed to seat reservation.

#### Scenario: Select a destination
- **WHEN** an authenticated user clicks on a destination
- **THEN** the system redirects the user to the seat reservation page for that destination
