# שומר-חנות 🛡️ — ניטור אוטומטי ללב התחביב

בודק כל 15 דקות שהאתר חי, שהקטלוג באמת נטען ושה-API עונה; פעם ביום טוען את
האתר ב-Chromium אמיתי (מוצרים מוצגים? שגיאות קונסול?); ובכל שישי בבוקר שולח
דוח זמינות שבועי. התראות בטלגרם + מייל, רק כשמשהו משתנה (בלי ספאם).

## הפעלה חד-פעמית (~5 דקות)

### 1. יצירת בוט טלגרם
1. בטלגרם, פתחו צ'אט עם **@BotFather** ושלחו `/newbot`.
2. שם לתצוגה: `שומר החנות — לב התחביב`. שם משתמש: משהו כמו `lev_watchdog_bot`.
3. שמרו את ה-**token** שמתקבל (נראה כמו `123456789:AAF...`).

### 2. קבוצה משותפת
1. צרו קבוצת טלגרם חדשה, למשל "שומר החנות 🛡️", והוסיפו את בעל החנות **ואת הבוט**.
2. שלחו בקבוצה הודעה כלשהי (למשל `/start`).
3. פתחו בדפדפן:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   וחפשו `"chat":{"id":-100...` — המספר **השלילי** הזה הוא ה-chat id של הקבוצה.
   (ריק? שלחו ל-BotFather ‏`/setprivacy` → Disable לבוט, הוציאו והחזירו את הבוט
   לקבוצה, ושלחו שוב הודעה.)

### 3. סודות ב-GitHub
`github.com/nivsasi1/lev-hatahbiv` ← Settings ← Secrets and variables ← Actions
← New repository secret, ארבעה סודות:

| שם | ערך |
|---|---|
| `TELEGRAM_BOT_TOKEN` | ה-token מ-BotFather |
| `TELEGRAM_CHAT_ID` | ה-id השלילי של הקבוצה |
| `SMTP_USER` | אותו ערך כמו ב-Render (חשבון ה-Gmail ששולח) |
| `SMTP_PASS` | אותו app password כמו ב-Render |

(את SMTP_USER/PASS מעתיקים מ-Render ← lev-hatahbiv-api ← Environment.
אם עוד לא הוגדרו שם: myaccount.google.com/apppasswords, דורש אימות דו-שלבי.)

המיילים נשלחים כברירת מחדל ל-`nivsasi@gmail.com` + `levhatahbiv@gmail.com`;
לשינוי הוסיפו secret בשם `ALERT_EMAILS` (מופרד בפסיקים).

### 4. בדיקה שהכל מחובר
Actions ← **watchdog** ← Run workflow ← סמנו **"שלח הודעת בדיקה"** ← Run.
תוך דקה אמורה להגיע הודעת 🔔 לקבוצה ולשני המיילים.

## מה בודקים, מתי

| Workflow | תדירות | בודק |
|---|---|---|
| `watchdog.yml` | כל 15 דק' | האתר עונה + באנדל הקטלוג מלא + API חי + עותק Cloudflare |
| `watchdog-deep.yml` | יומי ~08:00 | Chromium אמיתי: מוצרים מוצגים, אין שגיאות JS/קונסול |
| `watchdog-weekly.yml` | שישי ~08:30 | דוח זמינות שבועי לקבוצה |

- 🔴 אתר/קטלוג נפלו → התראה מיידית + הריצה אדומה. 🟡 API/Cloudflare → התראה בלבד.
- נפילה מתמשכת → תזכורת כל ~4 שעות. חזר לתקין → הודעת ✅ אחת.
- שינוי כתובות? משתני `SITE_URL` / `API_URL` / `CF_URL` בסקריפטים שב-`monitor/`.

## מגבלה ידועה
GitHub מכבה cron אחרי 60 יום בלי פעילות ברפו. הדוח השבועי מזהה את זה ומתריע;
התיקון: כפתור "Enable workflow" בעמוד ה-Actions.
