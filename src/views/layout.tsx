import { Html } from "@elysiajs/html";

interface LayoutProps {
  children: any;
  title?: string;
  user?: { id: number; email: string } | null;
}

export function Layout({ children, title = "Seat Reservation", user }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@2.0.4" />
        <style>{css}</style>
      </head>
      <body>
        <nav>
          <div class="nav-brand">
            <a href="/">Seat Reservation</a>
          </div>
          {user && (
            <div class="nav-links">
              <a href="/bookings">My Bookings</a>
              <button hx-post="/logout" hx-target="body" hx-push-url="/login">
                Logout
              </button>
            </div>
          )}
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}

const css = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5;
    color: #333;
    min-height: 100vh;
  }
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .nav-brand a {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
  }
  .nav-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .nav-links a {
    color: #2563eb;
    text-decoration: none;
  }
  .nav-links a:hover {
    text-decoration: underline;
  }
  .nav-links button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .nav-links button:hover {
    background: #dc2626;
  }
  main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  .card {
    background: #fff;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  .form-group input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
  }
  .btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
  }
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  .btn-primary:hover {
    background: #1d4ed8;
  }
  .btn-block {
    width: 100%;
  }
  .error {
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  .success {
    color: #16a34a;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .checkbox-group input[type="checkbox"] {
    width: auto;
  }
  h1 {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }
  .text-center {
    text-align: center;
  }
  .mt-2 {
    margin-top: 2rem;
  }
  .link {
    color: #2563eb;
    text-decoration: none;
  }
  .link:hover {
    text-decoration: underline;
  }
`;
