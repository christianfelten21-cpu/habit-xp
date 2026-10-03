"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Habit = {
  id: number;
  name: string;
  weeklyTarget: number;
  xpReward: number;
  logs: string[];
  archived?: boolean;
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

function parseLocalDate(dateString: string) {
  return new Date(`${dateString}T12:00:00`);
}

function getMonday(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + difference);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function getWeekKey(dateString: string) {
  return localDateString(getMonday(parseLocalDate(dateString)));
}

function currentWeekKey() {
  return localDateString(getMonday(new Date()));
}

function isInCurrentWeek(dateString: string) {
  return getWeekKey(dateString) === currentWeekKey();
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseLocalDate(dateString));
}

function formatWeek(weekKey: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseLocalDate(weekKey));
}

function buildXpTransactions(habits: Habit[]): XpTransaction[] {
  const transactions: XpTransaction[] = [];

  for (const habit of habits) {
    const weeklyCounts = new Map<string, number>();

    for (const log of habit.logs) {
      const week = getWeekKey(log);
      weeklyCounts.set(week, (weeklyCounts.get(week) ?? 0) + 1);
    }

    for (const [week, count] of weeklyCounts.entries()) {
      if (count >= habit.weeklyTarget) {
        transactions.push({
          id: `${habit.id}-${week}`,
          habitId: habit.id,
          habitName: habit.name,
          week,
          amount: habit.xpReward,
        });
      }
    }
  }

  return transactions.sort((a, b) => a.week.localeCompare(b.week));
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);

  const [name, setName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [xpReward, setXpReward] = useState(100);

  const [loaded, setLoaded] = useState(false);
  const [openDatePickers, setOpenDatePickers] = useState<
    Record<number, boolean>
  >({});
  const [customDates, setCustomDates] = useState<Record<number, string>>({});
  const [editingHabitId, setEditingHabitId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeeklyTarget, setEditWeeklyTarget] = useState(1);
  const [editXpReward, setEditXpReward] = useState(100);
  const [celebration, setCelebration] = useState<{ habitName: string; xp: number } | null>(null);

  useEffect(() => {
    const savedHabits = localStorage.getItem("habit-xp-habits");

    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    }

    // XP are derived from the logs now. Old cached transactions are no longer needed.
    localStorage.removeItem("habit-xp-transactions");

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem("habit-xp-habits", JSON.stringify(habits));
  }, [habits, loaded]);

  const transactions = useMemo(() => buildXpTransactions(habits), [habits]);

  const totalXp = useMemo(() => {
    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0
    );
  }, [transactions]);

  function addCompletion(habit: Habit, performedAt = localDateString()) {
    if (!performedAt || performedAt > localDateString()) return;

    const targetWeek = getWeekKey(performedAt);
    const countBefore = habit.logs.filter(
      (log) => getWeekKey(log) === targetWeek
    ).length;
    const reachesGoalNow =
      countBefore < habit.weeklyTarget &&
      countBefore + 1 >= habit.weeklyTarget;

    setHabits((currentHabits) =>
      currentHabits.map((currentHabit) =>
        currentHabit.id === habit.id
          ? {
              ...currentHabit,
              logs: [...currentHabit.logs, performedAt],
            }
          : currentHabit
      )
    );

    if (reachesGoalNow) {
      setCelebration({ habitName: habit.name, xp: habit.xpReward });
      window.setTimeout(() => setCelebration(null), 2200);
    }

    setOpenDatePickers((current) => ({
      ...current,
      [habit.id]: false,
    }));

    setCustomDates((current) => ({
      ...current,
      [habit.id]: localDateString(),
    }));
  }

  function removeCompletion(habitId: number, logIndex: number) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              logs: habit.logs.filter((_, index) => index !== logIndex),
            }
          : habit
      )
    );
  }

  function startEditing(habit: Habit) {
    setEditingHabitId(habit.id);
    setEditName(habit.name);
    setEditWeeklyTarget(habit.weeklyTarget);
    setEditXpReward(habit.xpReward);
  }

  function saveHabit(habitId: number) {
    if (!editName.trim() || editWeeklyTarget < 1 || editXpReward < 0) return;

    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === habitId
          ? { ...habit, name: editName.trim(), weeklyTarget: editWeeklyTarget, xpReward: editXpReward }
          : habit
      )
    );
    setEditingHabitId(null);
  }

  function archiveHabit(habitId: number) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === habitId ? { ...habit, archived: true } : habit
      )
    );
    setEditingHabitId(null);
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
      {celebration && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
          {Array.from({ length: 18 }).map((_, index) => {
            const angle = (index / 18) * Math.PI * 2;
            const distance = 110 + (index % 4) * 24;
            return (
              <span
                key={index}
                className="absolute h-3 w-3 rounded-full bg-white"
                style={{
                  transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`,
                  opacity: 0,
                  animation: `goal-particle 900ms ease-out ${(index % 5) * 35}ms forwards`,
                }}
              />
            );
          })}
          <div className="relative rounded-3xl border border-white/20 bg-zinc-950/95 px-10 py-8 text-center shadow-2xl animate-[goal-pop_2200ms_ease-out_forwards]">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-400">
              Wochenziel geschafft
            </p>
            <p className="mt-2 text-3xl font-bold">{celebration.habitName}</p>
            <p className="mt-3 text-5xl font-black">+{celebration.xp} XP</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes goal-pop {
          0% { opacity: 0; transform: scale(.55); }
          12% { opacity: 1; transform: scale(1.12); }
          22% { transform: scale(1); }
          82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(.96); }
        }
        @keyframes goal-particle {
          0% { opacity: 0; transform: translate(0, 0) scale(.4); }
          12% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Habit XP
            </p>
            <Link
              href="/rewards"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm transition hover:bg-zinc-800"
            >
              Rewards
            </Link>
          </div>

          <h1 className="text-4xl font-bold tracking-tight">Diese Woche</h1>
        </header>

        <section className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">Gesamt-XP</p>
              <p className="text-4xl font-bold">{totalXp} XP</p>
            </div>

            <p className="text-right text-sm text-zinc-500">
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
          {habits.filter((habit) => !habit.archived).map((habit) => {
            const currentWeekLogs = habit.logs
              .map((date, index) => ({ date, index }))
              .filter((log) => isInCurrentWeek(log.date))
              .sort((a, b) => b.date.localeCompare(a.date));

            const weeklyCount = currentWeekLogs.length;
            const reached = weeklyCount >= habit.weeklyTarget;
            const datePickerOpen = openDatePickers[habit.id] ?? false;
            const customDate = customDates[habit.id] ?? localDateString();

            return (
              <article
                key={habit.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{habit.name}</h2>

                    <p className="mt-1 text-sm text-zinc-400">
                      {habit.xpReward} XP bei erreichtem Wochenziel
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {reached && (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-black">
                        Geschafft
                      </span>
                    )}
                    <button
                      onClick={() => startEditing(habit)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Bearbeiten
                    </button>
                  </div>
                </div>

                {editingHabitId === habit.id && (
                  <div className="mb-5 space-y-3 rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-400"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-zinc-400">
                        Wochenziel
                        <input
                          type="number"
                          min="1"
                          value={editWeeklyTarget}
                          onChange={(event) => setEditWeeklyTarget(Number(event.target.value))}
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
                        />
                      </label>
                      <label className="text-sm text-zinc-400">
                        XP
                        <input
                          type="number"
                          min="0"
                          value={editXpReward}
                          onChange={(event) => setEditXpReward(Number(event.target.value))}
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => saveHabit(habit.id)} className="rounded-xl bg-white px-4 py-2 font-semibold text-black">
                        Speichern
                      </button>
                      <button onClick={() => setEditingHabitId(null)} className="rounded-xl border border-zinc-700 px-4 py-2">
                        Abbrechen
                      </button>
                      <button onClick={() => archiveHabit(habit.id)} className="ml-auto rounded-xl border border-zinc-700 px-4 py-2 text-zinc-400 hover:text-white">
                        Habit archivieren
                      </button>
                    </div>
                    <p className="text-xs text-zinc-600">
                      Archivieren entfernt das Habit aus deiner aktiven Liste, behält aber Logs und XP-Historie.
                    </p>
                  </div>
                )}

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

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => addCompletion(habit)}
                    className="rounded-2xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200"
                  >
                    + Heute erledigt
                  </button>

                  <button
                    onClick={() =>
                      setOpenDatePickers((current) => ({
                        ...current,
                        [habit.id]: !datePickerOpen,
                      }))
                    }
                    className="rounded-2xl border border-zinc-700 px-4 py-3 font-semibold transition hover:bg-zinc-800"
                  >
                    Anderes Datum
                  </button>
                </div>

                {datePickerOpen && (
                  <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 sm:flex-row">
                    <input
                      type="date"
                      max={localDateString()}
                      value={customDate}
                      onChange={(event) =>
                        setCustomDates((current) => ({
                          ...current,
                          [habit.id]: event.target.value,
                        }))
                      }
                      className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-zinc-400"
                    />

                    <button
                      onClick={() => addCompletion(habit, customDate)}
                      className="rounded-xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-200"
                    >
                      Eintragen
                    </button>
                  </div>
                )}

                <div className="mt-5 border-t border-zinc-800 pt-4">
                  <p className="mb-3 text-sm font-medium text-zinc-400">
                    Diese Woche geloggt
                  </p>

                  {currentWeekLogs.length === 0 ? (
                    <p className="text-sm text-zinc-600">
                      Noch keine Einträge diese Woche.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentWeekLogs.map((log) => (
                        <div
                          key={`${log.index}-${log.date}`}
                          className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2"
                        >
                          <span className="text-sm text-zinc-300">
                            ✓ {formatDate(log.date)}
                          </span>

                          <button
                            onClick={() =>
                              removeCompletion(habit.id, log.index)
                            }
                            className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                            aria-label={`Log vom ${formatDate(log.date)} löschen`}
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-6 text-xl font-semibold">Neues Habit hinzufügen</h2>

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
                onChange={(event) => setXpReward(Number(event.target.value))}
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
            <h2 className="mb-4 text-lg font-semibold">XP-Verlauf</h2>

            <div className="space-y-2">
              {[...transactions].reverse().map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 px-4 py-3"
                >
                  <div>
                    <p className="text-zinc-300">
                      {transaction.habitName}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Woche ab {formatWeek(transaction.week)}
                    </p>
                  </div>

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
