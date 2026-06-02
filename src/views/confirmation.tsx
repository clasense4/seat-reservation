import { Layout } from "./layout";

interface ConfirmationPageProps {
  bookingReference: string;
  destination: string;
  seat: string;
  user: { id: number; email: string };
}

export function ConfirmationPage({ bookingReference, destination, seat, user }: ConfirmationPageProps) {
  return (
    <Layout title="Confirmation - Seat Reservation" user={user}>
      <div class="card text-center">
        <div class="success-badge">&#10003;</div>
        <h1>Seat {seat} successfully reserved.</h1>

        <div class="confirmation-details">
          <div class="detail-row">
            <span class="detail-label">Booking Reference</span>
            <span class="detail-value ref">{bookingReference}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Destination</span>
            <span class="detail-value">{destination}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Seat</span>
            <span class="detail-value">{seat}</span>
          </div>
        </div>

        <div class="qr-placeholder">
          <div class="qr-box">
            <div class="qr-label">QR Code</div>
            <div class="qr-grid">
              {Array.from({ length: 64 }, (_, i) => (
                <div
                  class={`qr-cell ${Math.random() > 0.5 ? "dark" : "light"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div class="mt-2">
          <a href="/bookings" class="btn btn-primary">View My Bookings</a>
        </div>
      </div>

      <style>{confCss}</style>
    </Layout>
  );
}

const confCss = `
  .success-badge {
    width: 64px;
    height: 64px;
    background: #16a34a;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 0 auto 1rem;
  }
  .confirmation-details {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin: 1.5rem 0;
    text-align: left;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .detail-row:last-child {
    border-bottom: none;
  }
  .detail-label {
    color: #64748b;
  }
  .detail-value {
    font-weight: 600;
  }
  .detail-value.ref {
    font-family: monospace;
    font-size: 1.125rem;
    color: #2563eb;
  }
  .qr-placeholder {
    display: flex;
    justify-content: center;
    margin: 1.5rem 0;
  }
  .qr-box {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }
  .qr-label {
    font-size: 0.875rem;
    color: #94a3b8;
    margin-bottom: 0.5rem;
  }
  .qr-grid {
    display: grid;
    grid-template-columns: repeat(8, 12px);
    gap: 2px;
  }
  .qr-cell {
    width: 12px;
    height: 12px;
    border-radius: 1px;
  }
  .qr-cell.dark {
    background: #1e293b;
  }
  .qr-cell.light {
    background: #f1f5f9;
  }
`;
