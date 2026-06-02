import { Layout } from "./layout";

interface Seat {
  id: number;
  label: string;
  state: "available" | "held" | "held_by_me" | "reserved";
}

interface SeatMapPageProps {
  destination: { id: number; name: string };
  seats: Seat[];
  user: { id: number; email: string };
  userHold?: (Seat & { destinationName: string }) | null;
  slotCount: number;
  holdRemaining?: number;
}

export function SeatMapPage({ destination, seats, user, userHold, slotCount, holdRemaining = 0 }: SeatMapPageProps) {
  return (
    <Layout title={`${destination.name} - Seat Reservation`} user={user}>
      <div class="card">
        <a href="/destinations" class="back-link">&larr; Back to Destinations</a>
        <h1>Seat Reservation — {destination.name}</h1>
        <p class="slot-count">{slotCount} seats available</p>
        {userHold && (
          <div class="my-hold-banner">
            <div class="banner-text">
              <span>
                You are reserving seat <strong>{userHold.label}</strong> ({userHold.destinationName}).
                Expires in <strong id="hold-timer">{formatTime(holdRemaining)}</strong>.
              </span>
              <a href="/payment" class="link">Continue to Payment</a>
            </div>
            <button class="btn btn-primary" hx-post={`/seats/${userHold.id}/release`} hx-target="body" hx-swap="outerHTML">
              Cancel Seat
            </button>
          </div>
        )}
        <div class="seat-grid" hx-get={`/destinations/${destination.id}/seats/partial`} hx-trigger="every 3s" hx-swap="innerHTML">
          {seats.map((s) => (
            <SeatButton seat={s} disabled={!!userHold} />
          ))}
        </div>
      </div>

      <style>{seatCss}</style>

      {userHold && holdRemaining > 0 && (
        <script>
          {`
            let remaining = ${holdRemaining};
            const timer = setInterval(() => {
              remaining--;
              const el = document.getElementById('hold-timer');
              if (el) el.textContent = formatTime(remaining);
              if (remaining <= 0) {
                clearInterval(timer);
                window.location.href = '/destinations/${destination.id}/seats';
              }
            }, 1000);
            function formatTime(s) {
              var m = Math.floor(s / 60);
              var sec = s % 60;
              return m + ':' + (sec < 10 ? '0' : '') + sec;
            }
          `}
        </script>
      )}
    </Layout>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SeatButton({ seat, disabled }: { seat: Seat; disabled: boolean }) {
  const stateClass = {
    available: "seat-available",
    held: "seat-held",
    held_by_me: "seat-held-me",
    reserved: "seat-reserved",
  }[seat.state];

  const isClickable = seat.state === "available" && !disabled;

  if (isClickable) {
    return (
      <button
        class={`seat ${stateClass}`}
        hx-post={`/seats/${seat.id}/hold`}
        hx-target="body"
        hx-swap="outerHTML"
      >
        {seat.label}
      </button>
    );
  }

  return (
    <button class={`seat ${stateClass}`} disabled>
      {seat.label}
    </button>
  );
}

export function SeatMapPartial({ seats, userHold }: { seats: Seat[]; userHold?: (Seat & { destinationName: string }) | null }) {
  return (
    <>
      {seats.map((s) => (
        <SeatButton seat={s} disabled={!!userHold} />
      ))}
    </>
  );
}

const seatCss = `
  .back-link {
    display: inline-block;
    color: #64748b;
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    transition: color 0.15s;
  }
  .back-link:hover {
    color: #2563eb;
    text-decoration: underline;
  }
  .slot-count {
    color: #64748b;
    margin-bottom: 1rem;
  }
  .my-hold-banner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }
  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .my-hold-banner a {
    text-decoration: underline;
  }
  .seat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    max-width: 400px;
    margin: 0 auto;
  }
  .seat {
    aspect-ratio: 1;
    border: 2px solid;
    border-radius: 8px;
    font-size: 1.25rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s;
  }
  .seat:disabled {
    cursor: not-allowed;
  }
  .seat-available {
    background: #dcfce7;
    border-color: #86efac;
    color: #16a34a;
  }
  .seat-available:hover {
    background: #bbf7d0;
    transform: scale(1.05);
  }
  .seat-held {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #94a3b8;
  }
  .seat-held-me {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #2563eb;
  }
  .seat-reserved {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #94a3b8;
  }
`;
