"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gem, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const { error } = await authClient.signIn.email({ email: cleanEmail, password: cleanPassword });
    if (error) {
      console.error("Sign-in failed:", error);
      setError(
        error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : (error.message || "Incorrect email or password.")
      );
      setBusy(false);
      return;
    }
    router.push("/"); router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-white"><Gem size={22} /></div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Sign in to Jewel ERP</p>
          </div>
        </div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required autoComplete="username" />
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="field mb-4" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {error && <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        <button className="btn btn-primary w-full !h-11" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Sign in</button>
      </form>
    </main>
  );
}
