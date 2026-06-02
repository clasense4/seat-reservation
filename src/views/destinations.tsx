import { Layout } from "./layout";

interface Destination {
  id: number;
  name: string;
}

interface DestinationsPageProps {
  destinations: Destination[];
  user: { id: number; email: string };
  userHold: { id: number; label: string; destinationId: number; destinationName: string; remaining: number } | null;
}

export function DestinationsPage({ destinations, user, userHold }: DestinationsPageProps) {
  return (
    <Layout title="Select Destination - Seat Reservation" user={user}>
      <div class="card">
        <h1>Choose Destination</h1>
        {userHold && (
          <div class="my-hold-banner">
            <div class="banner-text">
              <span>
                You are reserving seat <strong>{userHold.label}</strong> ({userHold.destinationName}).
                Expires in <strong id="hold-timer">{formatTime(userHold.remaining)}</strong>.
              </span>
              <a href="/payment" class="link">Continue to Payment</a>
            </div>
            <button class="btn btn-primary" hx-post={`/seats/${userHold.id}/release`} hx-target="body" hx-swap="outerHTML">
              Cancel Seat
            </button>
          </div>
        )}
        <div class="destinations-grid">
          {destinations.map((d) => (
            <a href={`/destinations/${d.id}/seats`} class="destination-card">
              <span class="destination-name">{d.name}</span>
              <span class="destination-arrow">&rarr;</span>
            </a>
          ))}
        </div>
      </div>

      <style>{destCss}</style>

      {userHold && userHold.remaining > 0 && (
        <script>
          {`
            let remaining = ${userHold.remaining};
            const timer = setInterval(() => {
              remaining--;
              const el = document.getElementById('hold-timer');
              if (el) el.textContent = formatTime(remaining);
              if (remaining <= 0) {
                clearInterval(timer);
                window.location.href = '/destinations';
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

const destCss = `
  .destinations-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  .destination-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    text-decoration: none;
    color: #333;
    transition: border-color 0.2s, background 0.2s;
  }
  .destination-card:hover {
    border-color: #2563eb;
    background: #eff6ff;
  }
  .destination-name {
    font-size: 1.125rem;
    font-weight: 500;
  }
  .destination-arrow {
    font-size: 1.5rem;
    color: #2563eb;
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
`;
