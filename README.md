# CX Automation Audit

A five-step diagnostic that runs on a MacBook at the Gorgias booth. A visitor answers a
handful of questions about their support setup and gets a readout on the spot: a CX
automation readiness band, plus estimated annual savings and revenue upside on Gorgias.
It doubles as lead capture.

**Live: [https://murillo-gorgias.github.io/cx-automation-audit/](https://murillo-gorgias.github.io/cx-automation-audit/)**

That link is the **dev environment**. It runs over https, so the app writes to the dev
table and marks itself on screen. The real booth machines run the same files from disk.

Plain HTML, CSS and JavaScript. No build step, no package manager, no framework.
Open `index.html` and it runs.

## Setting up a booth laptop

Do this on each machine, ideally the day before.

1. **Unzip the file** on the laptop. The Desktop is easiest.
2. **Double-click `audit-tool`.** It opens the audit in Google Chrome with no    address bar, tabs or menus, so it looks like an app. Alternatively, open `index.html`, it also works but it shows the browser UI. Open the tool preferably on Chrome: Safari cannot write the local backup. The first time, macOS may say it cannot check the file. Right-click it, choose **Open**, then **Open** again. It only asks once.
3. **The tool is ready.** Every completed audit writes to the database on its own.
   To try it without creating a lead, open the round control at the bottom left on
   the contact form and choose **Skip**. That run is marked as a test.
4. **Set up the local backup.** On any screen except the first one, click the round
   control at the bottom left, then **Settings**, and enter the PIN `2609`.
5. **Name this laptop** in the box at the top, e.g. `name-macbook`, and press Enter.
   The name goes on every record so the two machines can be told apart later. It
   is stored on this machine only.
6. **Click "Connect the CSV"** and save the file somewhere you will find it again.
   Chrome asks to allow editing **once per launch**; click Allow. If somebody
   dismisses that prompt the CSV stops updating for that run, and the admin panel
   says so.
7. **Check the three tiles are green.** The left one counts audits that reached the
   database. The middle one counts audits still waiting to sync. The right one is
   the CSV.

**To close it:** the red button in the corner of the window, or `⌘Q`. There is also
a **Close the audit** button in the admin panel, which asks twice before it acts. If
Chrome refuses to close its own window, that button says so and tells you what to press.

Whoever runs the booth does not need this file. **Help, top right of the admin
panel** explains the CSV, both buttons and Chrome's permission box in plain words.

Confirm it works with the wifi switched off before you trust it.

## What `js/config.js` holds

It is the only file that changes between machines or between events. Everything in it
is set for eCommerce Expo London 2026.

| Setting | |
|---|---|
| `deviceDefault` | Leave it. The real name is set per laptop **in the admin panel** and kept in that machine's own browser storage. This is only what shows before anyone names it. |
| `supabase.url` / `anonKey` | Set. Project `gtxdlieipcklzskjrzjz` and its write-only anon key. If either were blank the app would store everything locally and sync nothing, and the admin panel would say "Supabase not set up". |
| `pin` | `2609`. It is fine for it to be public: it gates a curious visitor, and the data behind it is already on the laptop. |
| `bookingUtm.utm_campaign` | Still a placeholder. Bookings work; they will not trace back to the campaign until marketing ops sends the real value. |
| `standNumber` | `D40`. Shown on the closing screen. |

## How the database works

**One row per completed audit.** The app writes it the moment the results screen
appears, before the visitor has chosen what to do next. Nothing is written while
they are still answering: a visitor who walks away on question three leaves no row.

**Which table gets the row depends on how the app was opened, not on anything a
person chooses.**

| How the app was opened | Table |
|---|---|
| From disk, which is what `audit-tool` does on a booth laptop | `audits` |
| From a web address, including the live link above and a local server | `audits_dev` |

Both tables have the same columns. `audits` is the real leads. `audits_dev` is
anything written during a review or a demo, and can be emptied at any time.

**Skipping the contact form does not change the table.** It sets `test = true`
on the row and leaves the contact columns empty. The row still goes to the same
table, the same CSV and the same browser storage, so a test run exercises the
whole path. On a booth laptop a skipped run lands in `audits` with `test = true`.
Filter `test = false` to see real leads.

**Each row is written twice.** The first write adds the row with `booking` empty.
When the visitor taps a button on the results screen, the app updates that one
row and sets `booking` to one of:

| Value | What happened |
|---|---|
| `booked` | Tapped the booking button while online. The HubSpot page opened. |
| `intent_offline` | Tapped the booking button while offline. Nobody followed up on the spot. |
| `follow_up` | Asked for a follow-up instead of booking. |
| empty | Left the results screen without choosing, or the update has not synced yet. |

**What is in a row.** The visitor's contact details and consent; every answer they
tapped, both the label and the number the maths used; the readiness band and the
plan it maps to; the four figures they were shown on screen; the booking outcome;
`test`; `device`, the laptop's name; and `app_version`. `synced_at` is when the
row reached the table. The full list is in `supabase/schema.sql`.

**When it syncs.** Straight away if the laptop is online. If not, the row waits in
the browser's storage and the app retries every 60 seconds and again the moment
the connection returns. The admin panel counts what is waiting. A booking chosen
after the row already synced re-queues the row, so the outcome follows it up.

**The same row also goes to a CSV on the laptop**, when one is connected in the
admin panel. The CSV is rewritten in full after every audit and every booking
choice, so it always matches the browser's storage exactly. It is the backup if
the connection never comes back.

**What the key in the app is allowed to do.** The app carries the project's anon
key, which is public by design. Row Level Security is on, and the rules in
`supabase/schema.sql` let that key do exactly three things: add a row, find a row
by its id, and update a row's columns. It cannot read a name, an email or a
figure. Reading is for signed-in Supabase users only, which is how marketing ops
gets the leads.

The project sits in a **European region**. Visitors hand over a name and a work
email in the EU, and the consent screen promises GDPR handling.

`bash supabase/check-connection.sh` runs seven checks against the live project
and confirms the key can do what it should and nothing more. `supabase/schema.sql`
is safe to paste into the SQL editor again if the rules ever need rebuilding.

The database password is not used by this app at all. It is for connecting to
Postgres directly. Keep it in 1Password, never in this repo.

## Running it

| | |
|---|---|
| **Production** | The folder, opened from disk, normally via `audit-tool`. Writes to the `audits` table. |
| **Dev** | Anything served over http(s). Writes to `audits_dev` and shows a coral bar across the top so a review can never be mistaken for a real session. |

The switch is `location.protocol === 'file:'` — nothing to remember to flip.

To run the dev copy locally: `python3 -m http.server 8000` in this folder, then
open `http://127.0.0.1:8000`.

## What the launcher is

`audit-tool.app` is eight lines of shell in a folder that macOS treats as an app.
It starts Chrome in **app mode**, which hides the address bar, the tabs and the menus
but keeps the ordinary window, so the red close button still works.

It is deliberately not Chrome's **kiosk mode**. Kiosk hides the close button too, and
leaves `⌘Q` as the only way out of a machine somebody is holding in front of a customer.

It uses whatever Chrome profile is already running, so the laptop's name, the connected
CSV and the day's records are the same whether the audit was opened through the launcher
or by opening `index.html` directly. There is no second copy to keep straight.

## The staff controls

The round control at the bottom left of every screen after the splash opens:

- **Reset** — clears the session, back to the splash. Also `⌘⌫` from anywhere.
- **Skip contact form** — contact screen only. Starts a session flagged as a test,
  which still saves, syncs and reaches the CSV so the whole storage path gets
  exercised. Whoever reads the table filters `test = false`.
- **Settings** — asks for the PIN, then opens the admin panel.

A wrong PIN just says so. There is no lockout, deliberately: what is behind it is
the same data already on the laptop, and stranding staff mid-conversation is the
worse failure.

## What is where

| File | |
|---|---|
| `js/config.js` | Everything that changes between machines or before the event. |
| `js/content.js` | **Every word the visitor sees**, and the number behind each banded answer. Hand this to whoever owns the copy for a pass. |
| `js/roi.js` | The ported calculator. Pure arithmetic, no DOM. Reproduces the QA table in the build spec (§7) to the dollar. |
| `js/store.js` | The three copies of every record: browser storage, Supabase, the CSV on disk. |
| `js/screens.js` | Rendering, one function per screen. |
| `js/admin.js` | The PIN and the admin panel. |
| `js/app.js` | The flow, the idle timer, the staff menu. |
| `css/tokens.css` | Design tokens, named to match the Figma variables. |
| `css/app.css` | The screens. |

## Two things that will bite if you forget them

**No ES modules.** `type="module"` is blocked on `file://` origins, which is where
production runs. Scripts are plain `<script src>` in dependency order, each hanging
off one `CXA` global. Adding a module breaks production and not the dev build,
which is the worst way to find out.

**The CSV is rewritten in full, never appended.** A rewrite repairs itself: if the
permission prompt was dismissed for two hours, the next successful write catches up
every missed row. An append cannot, and the file would look perfectly healthy.
