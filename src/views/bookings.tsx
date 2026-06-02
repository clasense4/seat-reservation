import { Layout } from "./layout";

interface Reservation {
  bookingReference: string;
  destinationName: string;
  seatLabel: string;
  createdAt: string;
}

interface BookingsPageProps {
  reservations: Reservation[];
  user: { id: number; email: string };
}

export function BookingsPage({ reservations, user }: BookingsPageProps) {
  return (
    <Layout title="My Bookings - Seat Reservation" user={user}>
      <div class="card">
        <h1>My Bookings</h1>
        {reservations.length === 0 ? (
          <div class="empty-state">
            <p>You have no reservations yet.</p>
            <a href="/destinations" class="btn btn-primary mt-2">Book a Seat</a>
          </div>
        ) : (
          <div class="bookings-list">
            {reservations.map((r) => (
              <div class="booking-card">
                <div class="booking-ref">{r.bookingReference}</div>
                <div class="booking-details">
                  <span>{r.destinationName}</span>
                  <span>Seat {r.seatLabel}</span>
                  <span class="booking-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{bookCss}</style>
    </Layout>
  );
}

const bookCss = `
  .empty-state {
    text-align: center;
    padding: 3rem 0;
    color: #64748b;
  }
  .bookings-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .booking-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  .booking-ref {
    font-family: monospace;
    font-weight: 600;
    font-size: 1.125rem;
    color: #2563eb;
  }
  .booking-details {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: #64748b;
    font-size: 0.875rem;
  }
  .booking-date {
    color: #94a3b8;
    font-size: 0.75rem;
  }
`;
