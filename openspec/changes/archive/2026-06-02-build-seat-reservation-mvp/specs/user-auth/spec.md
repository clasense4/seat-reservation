## ADDED Requirements

### Requirement: User registration
The system SHALL allow a new user to register with a unique email address and a password.

#### Scenario: Successful registration
- **WHEN** a user submits the registration form with a unique email and a password
- **THEN** the system creates a new user account and redirects the user to the login page

#### Scenario: Duplicate email
- **WHEN** a user submits the registration form with an email that already exists
- **THEN** the system displays an error message and does not create a duplicate account

### Requirement: User login
The system SHALL authenticate a registered user using their email and password and establish a session.

#### Scenario: Successful login
- **WHEN** a user submits valid email and password credentials
- **THEN** the system creates a session and redirects the user to the destination selection page

#### Scenario: Invalid credentials
- **WHEN** a user submits incorrect email or password
- **THEN** the system displays an error message and does not create a session

### Requirement: Session persistence
The system SHALL support a "stay logged in for 90 days" option that extends session TTL.

#### Scenario: Persistent session selected
- **WHEN** a user logs in with the "stay logged in for 90 days" checkbox checked
- **THEN** the session MUST remain valid for 90 days of inactivity

#### Scenario: Default session duration
- **WHEN** a user logs in without selecting the persistent option
- **THEN** the session MUST expire after a shorter default duration (e.g., 24 hours)

### Requirement: Logout
The system SHALL allow an authenticated user to terminate their session.

#### Scenario: Successful logout
- **WHEN** an authenticated user clicks the logout button
- **THEN** the system invalidates the session and redirects to the login page
