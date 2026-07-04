// שומר-חנות — the Friday-morning weekly digest. Counts the week's watchdog
// runs via the GitHub API and summarizes availability in Hebrew. Also spots
// the silent killer: GitHub disabling cron after 60 days of repo inactivity.
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), ".state");
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

async function completedRuns(workflowFile) {
  const runs = [];
  for (let pageN = 1; pageN <= 10; pageN++) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs` +
        `?per_page=100&page=${pageN}&created=${encodeURIComponent(">=" + since)}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${workflowFile}`);
    const batch = (await res.json()).workflow_runs || [];
    runs.push(...batch);
    if (batch.length < 100) break;
  }
  return runs
    .filter((r) => r.status === "completed")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

const pulse = await completedRuns("watchdog.yml");
const deep = await completedRuns("watchdog-deep.yml");

const bad = pulse.filter((r) => r.conclusion !== "success").length;
const availability = pulse.length
  ? (((pulse.length - bad) / pulse.length) * 100).toFixed(1)
  : "?";

// incidents = groups of consecutive red runs; each run covers ~15 minutes
const incidents = [];
let current = 0;
for (const r of pulse) {
  if (r.conclusion !== "success") current++;
  else if (current) incidents.push(current), (current = 0);
}
if (current) incidents.push(current);
const longest = incidents.length ? Math.max(...incidents) * 15 : 0;

const deepBad = deep.filter((r) => r.conclusion !== "success").length;

const lines = [
  "📊 שומר-חנות — דוח שבועי",
  "",
  pulse.length
    ? `${bad === 0 ? "🎉" : "✅"} זמינות החנות: ${availability}% (${pulse.length - bad}/${pulse.length} בדיקות)`
    : "❓ לא נמצאו בדיקות השבוע",
  incidents.length
    ? `🔻 תקלות: ${incidents.length} · הארוכה ~${longest} דק'`
    : "🔻 תקלות: אפס — שבוע שקט",
  deep.length
    ? `🌅 בדיקות עומק (דפדפן): ${deep.length - deepBad}/${deep.length} עברו`
    : "🌅 בדיקות עומק: לא רצו השבוע",
];

// ~672 pulse runs in a full week; under half of that smells like disabled cron
if (pulse.length < 300)
  lines.push(
    "",
    "⚠️ מספר הבדיקות נמוך מהצפוי — ייתכן ש-GitHub השבית את התזמון",
    "(קורה אחרי 60 יום בלי פעילות ברפו). Actions ← שומר-חנות ← Enable workflow."
  );

const stamp = new Date().toLocaleString("he-IL", {
  timeZone: "Asia/Jerusalem",
  dateStyle: "short",
  timeStyle: "short",
});
lines.push("", `🕒 ${stamp} (שעון ישראל)`);

const message = lines.join("\n");
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(join(STATE_DIR, "alert.txt"), message);
writeFileSync(join(STATE_DIR, "subject.txt"), "📊 שומר-חנות — דוח שבועי");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "notify=true\n");

console.log(message);
