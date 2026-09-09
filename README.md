# CX Automation Audit

A five-step diagnostic that runs on a MacBook at the Gorgias booth. A visitor answers a
handful of questions about their support setup and gets a readout on the spot: a CX
automation readiness band, plus estimated annual savings and revenue upside on Gorgias.
It doubles as lead capture.

Plain HTML, CSS and JavaScript. No build step, no package manager, no framework.
Open `index.html` and it runs.

## Setting up a booth laptop

Do this on each machine, ideally the day before.

1. **Copy this whole folder** to the laptop. Anywhere is fine — Desktop is easiest.
2. **Open `index.html` in Chrome.** Chrome, not Safari — Safari refuses to store
   anything on a `file://` page, and that is where the day's leads sit before they
   sync (ADR-0011).
3. **Open the staff menu** — the small round control at the bottom left — then
   **Settings**, and enter the PIN.
4. **Click "Connect the CSV"** and save the file somewhere you will find it again.
   Chrome asks to allow editing **once per launch**; click Allow. If somebody
   dismisses that prompt the CSV stops updating for that run, and the admin panel
   says so.
5. **Check the three tiles are green**, then click Back to the audit.
6. **Full screen: `⌃⌘F`.** Hides the address bar and the tabs.
7. Turn off sleep and notifications for the day.

Confirm it works with the wifi switched off before you trust it.

## Before the event

Edit `js/config.js` — it is the only file that needs changing.

| Setting | |
|---|---|
| `device` | Name this laptop, e.g. `theo-macbook`. It lands on every record so two machines can be told apart afterwards. |
| `supabase.url` / `anonKey` | The project and its write-only anon key. **Until these are filled in the app stores everything locally and syncs nothing** — the admin panel says "Supabase not set up". |
| `pin` | Change it from the default. Put it in the setup guide, never in this repo. |
| `bookingUtm.utm_campaign` | Placeholder until Angelo sends the real values (open question 3). |
| `standNumber` | Shown on the closing screen. |

## Running it

| | |
|---|---|
| **Production** | The folder, opened from disk. Writes to the `audits` table. |
| **Dev** | Anything served over http(s). Writes to `audits_dev` and shows a coral bar across the top so a review can never be mistaken for a real session. |

The switch is `location.protocol === 'file:'` — nothing to remember to flip.

To run the dev copy locally: `python3 -m http.server 8000` in this folder, then
open `http://127.0.0.1:8000`.

## The staff controls

The round control at the bottom left of every screen opens:

- **Reset** — clears the session, back to the splash. Also `⌘⌫` from anywhere.
- **Skip contact form** — contact screen only. Starts a session flagged as a test,
  which still saves, syncs and reaches the CSV so the whole storage path gets
  exercised. Angelo filters `test = false` (ADR-0013).
- **Settings** — asks for the PIN, then opens the admin panel.

A wrong PIN just says so. There is no lockout, deliberately: what is behind it is
the same data already on the laptop, and stranding staff mid-conversation is the
worse failure.

## What is where

| File | |
|---|---|
| `js/config.js` | Everything that changes between machines or before the event. |
| `js/content.js` | **Every word the visitor sees**, and the number behind each banded answer. Hand this to Alana or Theo for a copy pass. |
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
every missed row. An append cannot, and the file would look perfectly healthy
(ADR-0012).
