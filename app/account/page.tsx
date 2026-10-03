import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-4">Eingeloggt als {user.email}</p>
      <div className="mt-6 flex gap-3">
        <Link className="rounded-xl border px-4 py-2" href="/">
          Zur App
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
