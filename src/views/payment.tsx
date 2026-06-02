import { Layout } from "./layout";

interface PaymentPageProps {
  destination: { id: number; name: string };
  seat: { id: number; label: string };
  user: { id: number; email: string };
  holdRemaining: number;
  error?: string;
}

export function PaymentPage({ destination, seat, user, holdRemaining, error }: PaymentPageProps) {
  const price = "Rp 50,000";
  return (
    <Layout title="Payment - Seat Reservation" user={user}>
      <div class="card">
        <h1>Payment</h1>

        {error && <div class="error">{error}</div>}

        <div class="payment-summary">
          <div class="summary-row">
            <span>Destination</span>
            <span>{destination.name}</span>
          </div>
          <div class="summary-row">
            <span>Seat</span>
            <span>{seat.label}</span>
          </div>
          <div class="summary-row">
            <span>Price</span>
            <span>{price}</span>
          </div>
          <div class="summary-row">
            <span>Expires in</span>
            <span id="hold-timer">{formatTime(holdRemaining)}</span>
          </div>
        </div>

        <form hx-post="/payment" hx-target="body" hx-push-url="/confirmation">
          <div class="form-group">
            <label for="card-number">Card Number</label>
            <input
              type="text"
              id="card-number"
              name="cardNumber"
              placeholder="4242 4242 4242 4242"
              required
              maxlength={19}
              class="card-input"
            />
          </div>
          <div class="card-row">
            <div class="form-group">
              <label for="expiry">Expiry</label>
              <input type="text" id="expiry" name="expiry" placeholder="12/28" required maxlength={5} />
            </div>
            <div class="form-group">
              <label for="cvv">CVV</label>
              <input type="text" id="cvv" name="cvv" placeholder="123" required maxlength={3} />
            </div>
          </div>
          <p class="card-hint">Demo card: <strong>4242 4242 4242 4242</strong> (any other card fails)</p>
          <button type="submit" class="btn btn-primary btn-block mt-2">Pay {price}</button>
        </form>
      </div>

      <script>
        {`
          function formatTime(s) {
            var m = Math.floor(s / 60);
            var sec = s % 60;
            return m + ':' + (sec < 10 ? '0' : '') + sec;
          }

          // Client-side countdown timer
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

          // Auto-format card number: groups of 4 digits separated by spaces
          document.getElementById('card-number').addEventListener('input', function (e) {
            var raw = this.value.replace(/\\D/g, '').slice(0, 16);
            var formatted = '';
            for (var i = 0; i < raw.length; i++) {
              if (i > 0 && i % 4 === 0) formatted += ' ';
              formatted += raw[i];
            }
            this.value = formatted;
          });

          // Auto-format expiry: MM/YY
          document.getElementById('expiry').addEventListener('input', function (e) {
            var raw = this.value.replace(/\\D/g, '').slice(0, 4);
            if (raw.length > 2) {
              this.value = raw.slice(0, 2) + '/' + raw.slice(2);
            } else {
              this.value = raw;
            }
          });
        `}
      </script>

      <style>{paymentCss}</style>
    </Layout>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const paymentCss = `
  .payment-summary {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .summary-row:last-child {
    border-bottom: none;
  }
  .card-row {
    display: flex;
    gap: 1rem;
  }
  .card-row .form-group {
    flex: 1;
  }
  .card-hint {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 0.5rem;
  }
  .card-input {
    font-family: monospace;
    letter-spacing: 1px;
  }
`;
