"use client";

import { useEffect, useMemo, useState } from "react";

type Habit = {
  id: number;
  name: string;
  weeklyTarget: number;
  xpReward: number;
  logs: string[];
};

type XpTransaction = {
  id: string;
  habitId: number;
  habitName: string;
  week: string;
  amount: number;
};

const initialHabits: Habit[] = [
  {
    id: 1,
    name: "Neurofeedback",
    weeklyTarget: 3,
    xpReward: 100,
    logs: [],
  },
  {
    id: 2,
    name: "Sport",
    weeklyTarget: 3,
    xpReward: 100,
    logs: [],
  },
];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + difference);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function currentWeekKey() {
  return localDateString(getMonday(new Date()));
}

function isInCurrentWeek(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  const monday = getMonday(new Date());

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return date >= monday && date <= sunday;
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [transactions, setTransactions] = useState<XpTransaction[]>([]);

  const [name, setName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [xpReward, setXpReward] = useState(100);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedHabits = localStorage.getItem("habit-xp-habits");
    const savedTransactions = localStorage.getItem("habit-xp-transactions");

    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    }

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem("habit-xp-habits", JSON.stringify(habits));
    localStorage.setItem(
      "habit-xp-transactions",
      JSON.stringify(transactions)
    );
  }, [habits, transactions, loaded]);

  const totalXp = useMemo(() => {
    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
  }, [transactions]);

  function addCompletion(habit: Habit) {
    const today = localDateString();

    const currentWeekCount = habit.logs.filter(isInCurrentWeek).length;
    const newCount = currentWeekCount + 1;

    setHabits((currentHabits) =>
      currentHabits.map((currentHabit) =>
        currentHabit.id === habit.id
          ? {
              ...currentHabit,
              logs: [...currentHabit.logs, today],
            }
          : currentHabit
      )
    );

    const week = currentWeekKey();

    const alreadyRewarded = transactions.some(
      (transaction) =>
        transaction.habitId === habit.id && transaction.week === week
    );

    if (newCount >= habit.weeklyTarget && !alreadyRewarded) {
      setTransactions((currentTransactions) => [
        ...currentTransactions,
        {
          id: crypto.randomUUID(),
          habitId: habit.id,
          habitName: habit.name,
          week,
          amount: habit.xpReward,
        },
      ]);
    }
  }

  function addHabit() {
    if (!name.trim()) return;
    if (weeklyTarget < 1) return;
    if (xpReward < 0) return;

    const newHabit: Habit = {
      id: Date.now(),
      name: name.trim(),
      weeklyTarget,
      xpReward,
      logs: [],
    };

    setHabits((currentHabits) => [...currentHabits, newHabit]);

    setName("");
    setWeeklyTarget(3);
    setXpReward(100);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Habit XP
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Diese Woche
          </h1>
        </header>

        <section className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-sm text-zinc-400">Gesamt-XP</p>
              <p className="text-4xl font-bold">{totalXp} XP</p>
            </div>

            <p className="text-sm text-zinc-500">
              nächstes Ziel: 1000 XP
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{
                width: `${Math.min((totalXp / 1000) * 100, 100)}%`,
              }}
            />
          </div>
        </section>

        <section className="space-y-4">
          {habits.map((habit) => {
            const weeklyCount = habit.logs.filter(isInCurrentWeek).length;
            const reached = weeklyCount >= habit.weeklyTarget;

            return (
              <article
                key={habit.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {habit.name}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-400">
                      {habit.xpReward} XP bei erreichtem Wochenziel
                    </p>
                  </div>

                  {reached && (
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-black">
                      Geschafft
                    </span>
                  )}
                </div>

                <div className="mb-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      {weeklyCount} / {habit.weeklyTarget} diese Woche
                    </span>

                    <span className="text-zinc-500">
                      {Math.min(
                        Math.round(
                          (weeklyCount / habit.weeklyTarget) * 100
                        ),
                        100
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          (weeklyCount / habit.weeklyTarget) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => addCompletion(habit)}
                  className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200"
                >
                  + Erledigt
                </button>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-xl font-semibold">
            Neues Habit hinzufügen
          </h2>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">
                Was möchtest du regelmäßig machen?
              </span>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Meditation"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">
                Wie oft pro Woche?
              </span>

              <input
                type="number"
                min="1"
                value={weeklyTarget}
                onChange={(event) =>
                  setWeeklyTarget(Number(event.target.value))
                }
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">
                XP bei erreichtem Wochenziel
              </span>

              <input
                type="number"
                min="0"
                step="10"
                value={xpReward}
                onChange={(event) =>
                  setXpReward(Number(event.target.value))
                }
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-400"
              />
            </label>

            <button
              onClick={addHabit}
              className="w-full rounded-2xl border border-zinc-700 px-4 py-3 font-semibold transition hover:bg-zinc-800"
            >
              Habit erstellen
            </button>
          </div>
        </section>

        {transactions.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">
              XP-Verlauf
            </h2>

            <div className="space-y-2">
              {[...transactions].reverse().map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between rounded-2xl border border-zinc-800 px-4 py-3"
                >
                  <span className="text-zinc-300">
                    {transaction.habitName}
                  </span>

                  <span className="font-semibold">
                    +{transaction.amount} XP
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
