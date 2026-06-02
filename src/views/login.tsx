import { Layout } from "./layout";

interface LoginPageProps {
  error?: string;
}

export function LoginPage({ error }: LoginPageProps) {
  return (
    <Layout title="Login - Seat Reservation">
      <div class="card">
        <h1>Login</h1>
        {error && <div class="error">{error}</div>}
        <form hx-post="/login" hx-target="body" hx-push-url="/destinations">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required />
          </div>
          <div class="checkbox-group">
            <input type="checkbox" id="persistent" name="persistent" value="1" />
            <label for="persistent">Stay logged in for 90 days</label>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Login</button>
        </form>
        <p class="text-center mt-2">
          Don't have an account? <a href="/register" class="link">Register</a>
        </p>
      </div>
    </Layout>
  );
}
