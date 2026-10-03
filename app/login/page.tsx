"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function signUp() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account erstellt. Falls Supabase eine Bestätigung verlangt, prüfe deine E-Mails.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Habit XP</h1>
        <p className="mt-2 text-sm opacity-70">Einloggen oder Account erstellen</p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl border px-4 py-3"
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border px-4 py-3"
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button
            className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? "Bitte warten…" : "Einloggen"}
          </button>

          <button
            className="w-full rounded-xl border px-4 py-3 font-medium disabled:opacity-50"
            type="button"
            disabled={loading}
            onClick={signUp}
          >
            Account erstellen
          </button>
        </form>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </main>
  );
}
