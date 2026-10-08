"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Could not sign in.");
      setBusy(false);
      return;
    }
    router.replace("/admin/inventory");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <form className="admin-login-form" onSubmit={signIn}>
        <div className="eyebrow">SUNDER INVENTORY</div>
        <h1>Admin sign in</h1>
        <label htmlFor="admin-password">Password</label>
        <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}