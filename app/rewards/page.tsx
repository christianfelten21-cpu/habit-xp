"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Habit = {
  id: number;
  name: string;
  weeklyTarget: number;
  xpReward: number;
  logs: string[];
};

type Reward = {
  id: number;
  name: string;
  xpCost: number;
};

type Redemption = {
  id: number;
  rewardName: string;
  xpCost: number;
  redeemedAt: string;
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`);
}

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekKey(dateString: string) {
  return localDateString(getMonday(parseLocalDate(dateString)));
}

function earnedXp(habits: Habit[]) {
  let total = 0;

  for (const habit of habits) {
    const weeklyCounts = new Map<string, number>();

    for (const log of habit.logs) {
      const week = getWeekKey(log);
      weeklyCounts.set(week, (weeklyCounts.get(week) ?? 0) + 1);
    }

    for (const count of weeklyCounts.values()) {
      if (count >= habit.weeklyTarget) total += habit.xpReward;
    }
  }

  return total;
}

export default function RewardsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [name, setName] = useState("");
  const [xpCost, setXpCost] = useState(500);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedHabits = localStorage.getItem("habit-xp-habits");
    const savedRewards = localStorage.getItem("habit-xp-rewards");
    const savedRedemptions = localStorage.getItem("habit-xp-redemptions");

    if (savedHabits) setHabits(JSON.parse(savedHabits));
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    if (savedRedemptions) setRedemptions(JSON.parse(savedRedemptions));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("habit-xp-rewards", JSON.stringify(rewards));
    localStorage.setItem("habit-xp-redemptions", JSON.stringify(redemptions));
  }, [rewards, redemptions, loaded]);

  const lifetimeXp = useMemo(() => earnedXp(habits), [habits]);
  const spentXp = useMemo(
    () => redemptions.reduce((sum, redemption) => sum + redemption.xpCost, 0),
    [redemptions]
  );
  const availableXp = lifetimeXp - spentXp;

  function addReward() {
    if (!name.trim() || xpCost < 1) return;

    setRewards((current) => [
      ...current,
      { id: Date.now(), name: name.trim(), xpCost },
    ]);
    setName("");
    setXpCost(500);
  }

  function redeemReward(reward: Reward) {
    if (availableXp < reward.xpCost) return;

    setRedemptions((current) => [
      ...current,
      {
        id: Date.now(),
        rewardName: reward.name,
        xpCost: reward.xpCost,
        redeemedAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Habit XP
            </p>
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm transition hover:bg-zinc-800"
            >
              Habits
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Rewards</h1>
        </header>

        <section className="mb-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Lifetime XP</p>
            <p className="mt-2 text-4xl font-bold">{lifetimeXp} XP</p>
            <p className="mt-2 text-sm text-zinc-600">Kann niemals sinken.</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">XP-Konto</p>
            <p className="mt-2 text-4xl font-bold">{availableXp} XP</p>
            <p className="mt-2 text-sm text-zinc-600">
              {spentXp} XP bisher eingelöst
            </p>
          </div>
        </section>

        <section className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">Neue Belohnung</h2>
          <div className="space-y-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. 100 € Spaßbudget"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-400"
            />
            <input
              type="number"
              min="1"
              step="50"
              value={xpCost}
              onChange={(event) => setXpCost(Number(event.target.value))}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-400"
            />
            <button
              onClick={addReward}
              className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Belohnung hinzufügen
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="mb-4 text-xl font-semibold">Meine Belohnungen</h2>
          {rewards.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 p-4 text-zinc-500">
              Noch keine Belohnungen angelegt.
            </p>
          ) : (
            rewards.map((reward) => {
              const affordable = availableXp >= reward.xpCost;
              return (
                <article
                  key={reward.id}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div>
                    <h3 className="font-semibold">{reward.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {reward.xpCost} XP
                    </p>
                  </div>
                  <button
                    onClick={() => redeemReward(reward)}
                    disabled={!affordable}
                    className="rounded-2xl bg-white px-4 py-2 font-semibold text-black transition enabled:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Einlösen
                  </button>
                </article>
              );
            })
          )}
        </section>

        {redemptions.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold">Einlöseverlauf</h2>
            <div className="space-y-2">
              {[...redemptions].reverse().map((redemption) => (
                <div
                  key={redemption.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 px-4 py-3"
                >
                  <div>
                    <p className="text-zinc-300">{redemption.rewardName}</p>
                    <p className="text-xs text-zinc-600">
                      {new Intl.DateTimeFormat("de-DE").format(
                        new Date(redemption.redeemedAt)
                      )}
                    </p>
                  </div>
                  <span className="font-semibold">-{redemption.xpCost} XP</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
