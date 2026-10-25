import { useEffect, useState } from "react";
import type { Order } from "./types";

// How long an order has been waiting, and when that becomes a problem. Only a
// PAID order can be late: it's money in and nothing sent yet. Handled,
// cancelled and refunded orders are done; "new"/"failed" are payment attempts
// that never completed, so there is nothing to fulfil.
export const AGING = { warnHours: 24, lateHours: 48 };

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type AgeLevel = "warn" | "late" | null;

export const ageLevel = (o: Order, now: number): AgeLevel => {
  if (o.status !== "paid") return null;
  const age = now - Date.parse(o.createdAt);
  if (!Number.isFinite(age)) return null;
  if (age >= AGING.lateHours * HOUR) return "late";
  if (age >= AGING.warnHours * HOUR) return "warn";
  return null;
};

// Hebrew counts with the dual forms the language uses for 1 and 2
const hours = (n: number) => (n === 1 ? "שעה" : n === 2 ? "שעתיים" : `${n} שעות`);
const days = (n: number) => (n === 1 ? "יום" : n === 2 ? "יומיים" : `${n} ימים`);

// "עכשיו", "12 דק'", "5 שעות", "יום ו־3 שעות", "6 ימים" — without the "לפני",
// so it reads both as "לפני …" and as "ממתינה …"
export const span = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 60_000) return "רגע";
  if (ms < HOUR) return `${Math.floor(ms / 60_000)} דק׳`;
  if (ms < DAY) return hours(Math.floor(ms / HOUR));
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  // past a week the hours are noise
  return d < 7 && h > 0 ? `${days(d)} ו־${hours(h)}` : days(d);
};

export const ago = (iso: string, now: number) => {
  const ms = now - Date.parse(iso);
  return ms < 60_000 ? "עכשיו" : `לפני ${span(ms)}`;
};

// "יום שישי · 24.10.2026 · 14:32", Israel time whatever the device's zone
export const orderWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = { timeZone: "Asia/Jerusalem" } as const;
  const weekday = d.toLocaleDateString("he-IL", { ...tz, weekday: "long" });
  const date = d.toLocaleDateString("he-IL", tz);
  const time = d.toLocaleTimeString("he-IL", { ...tz, hour: "2-digit", minute: "2-digit" });
  return `${weekday} · ${date} · ${time}`;
};

// re-render every minute so "לפני 5 שעות" and the overdue colour stay true
// while the dashboard is left open on the shop's computer
export const useNow = (everyMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
};
