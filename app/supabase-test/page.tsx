import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold">Supabase-Verbindung</h1>
          <p className="mt-4 text-red-600">Fehler: {error.message}</p>
        </main>
      );
    }

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Supabase-Verbindung</h1>
        <p className="mt-4 text-green-600">
          Verbindung erfolgreich. Supabase antwortet.
        </p>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";

    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Supabase-Verbindung</h1>
        <p className="mt-4 text-red-600">Fehler: {message}</p>
      </main>
    );
  }
}
