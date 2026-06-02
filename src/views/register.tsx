import { Layout } from "./layout";

interface RegisterPageProps {
  error?: string;
}

export function RegisterPage({ error }: RegisterPageProps) {
  return (
    <Layout title="Register - Seat Reservation">
      <div class="card">
        <h1>Register</h1>
        {error && <div class="error">{error}</div>}
        <form hx-post="/register" hx-target="body" hx-push-url="/login">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength={6} />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Register</button>
        </form>
        <p class="text-center mt-2">
          Already have an account? <a href="/login" class="link">Login</a>
        </p>
      </div>
    </Layout>
  );
}
