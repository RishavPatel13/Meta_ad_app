import { FormEvent, useState } from "react";

type Props = {
  onSignedIn: (user: { username: string; role: string }) => void;
};

export default function LoginPage({ onSignedIn }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Could not sign in");
      }
      localStorage.setItem("meta-ad-token", data.token);
      onSignedIn(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-art">
        <p className="login-kicker">GCB · Meta Ad Desk</p>
        <h1>The house where research becomes paid ads.</h1>
        <p>
          Sign in to brief products, pick personas, lock a creative type, and
          push work through Airtable and n8n without burning extra tokens.
        </p>
        <ul>
          <li>Central desk for the full creative pipeline</li>
          <li>Admin-controlled access for the team</li>
          <li>Disable an employee the day they leave</li>
        </ul>
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <p className="login-kicker">Restricted access</p>
        <h2>Sign in</h2>
        <p className="muted">
          Use your desk credentials. Accounts will be issued and revoked from
          the admin panel.
        </p>
        {error ? <div className="flash error">{error}</div> : null}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </div>
        <button className="btn primary login-submit" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Enter the desk"}
        </button>
      </form>
    </div>
  );
}
