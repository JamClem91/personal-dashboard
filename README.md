# Personal Dashboard

A single-file personal dashboard: projects, tasks, habits, goals, ideas, focus — runs anywhere, owns nothing.

The entire app is one `index.html` with no dependencies, no build step, and no server. Open it in a browser and start using it. (Three small companion files — `manifest.webmanifest`, `sw.js`, `icon.svg` — are optional and only enable offline install when the page is hosted.)

## Features

### Capture & organise
- **Home overview** — stats, today's habits, upcoming tasks across all projects, goals, quick links, ideas inbox, and a scratchpad.
- **One tab per project** — each project has its own description, status, task list, notes, and links. Projects can be edited, archived, restored, and deleted.
- **Tasks** — priority (high/med/low), optional due dates with overdue highlighting, and **subtasks/checklists** (one per line in the task dialog). The home page rolls up the top open tasks across every project, sorted by due date then priority.
- **List or Kanban board** — toggle any project's tasks between a list and a **To-do / Doing / Done board**. Drag cards between columns on desktop, or use the ◀ ▶ buttons on touch devices. Moving a card to *Done* completes the task (and vice-versa).
- **Ideas inbox** — type an idea and hit Enter. Promote any idea into a full project with one click.
- **Goals** — progress bars driven by either a manual percentage or a checklist of milestones, optionally linked to a project.
- **Quick links** — pinned favorites on the home page; per-project links on each project tab.

### Plan & focus
- **☀️ Today view** — daily planning mode: pick your **top 3 priorities** for the day, see what's due today and what's overdue, check off habits, and watch your focus time and tasks-done counters. Warns you when the estimates you've planned exceed your daily capacity.
- **📅 Calendar** — a month grid of every task due date, colour-coded by priority, with overdue days flagged. Click any task to edit it; page through months freely.
- **⏱ Pomodoro focus timer** — start a focus session from any task (or a generic one from Today). A floating widget counts down work/break cycles with pause, resume, skip, and stop. Time is logged per task and per project.
- **🪄 Weekly review** — a guided GTD wizard in three passes: **Get Clear** (empty the idea inbox to zero), **Get Current** (sweep overdue work, flag tasks not linked to a goal), and **Get Creative** (revisit goals and set a weekly confidence on each). A reminder dot appears on the Review button once a week.
- **🎯 Implementation intentions** — give any task a *"when/where will you do this?"* cue, and anchor any habit to an existing routine (*"after I pour my morning coffee"*). Specifying the when/where is the single best-evidenced way to actually follow through.
- **Personal OKRs** — nest goals into Objective → Key Result cascades with an optional horizon (annual / quarter / week), and link tasks to the goal they advance so you can see what actually ladders up.
- **🔁 Resurfacing** — goals and ideas come back for a spaced-repetition check ("still relevant?") so they don't silently rot. Keep pushes the next check further out; snooze brings it back soon; mute stops it.

### Track & reflect
- **Habit tracker** — daily check-offs with streak counters (an unchecked *today* doesn't break the streak until the day is over).
- **Habit heatmap** — open any habit's history (▦ button) for a GitHub-style year grid plus current streak, best streak, total days, and 30-day consistency. Tap any past day to backfill or correct your history.
- **📊 Stats** — tasks completed per week and velocity, **estimation accuracy** (how your estimates compare to logged time), **most-productive hours and days** detected from your own history, **cycle time** (how long tasks take from created to done), busiest projects, focus time by project, and habit consistency.
- **🔮 Finish forecasts** — each project runs a Monte-Carlo simulation over your recent completion pace to project a finish date as a confidence range ("85% confident by …"), instead of a single optimistic guess.
- **Insights** — gentle, variance-aware nudges on Home: a dip in completions, an overdue pile-up, a long habit streak that just broke, or a day you've over-planned.
- **✨ Year in review** — a Wrapped-style retrospective of your year: tasks completed, hours focused, longest streak, peak hour and day, and your most-focused project.

The estimation, calibration, peak-time, cycle-time, forecasting, and OKR features were chosen from a cited research pass over what proven productivity systems and personal-analytics tools actually do — the load-bearing evidence is implementation intentions (if-then planning), the planning fallacy / reference-class forecasting, Little's-Law flow metrics, and the spacing effect.

### Polish
- **Theme system** — dark/light toggle and an accent-colour picker (Settings ⚙️). Charts, buttons, and highlights follow your accent.
- **Undo, not nag** — deletes happen instantly with an **Undo** toast instead of blocking confirmation dialogs. Importing a backup is undoable too.
- **Install as an app (PWA)** — when hosted over http/https, the dashboard is installable to your home screen and works fully offline via a service worker.
- **Export / Import** — download all data as JSON, restore it anywhere (Settings ⚙️).

## Usage

Clone or download this repo, then open `index.html` in any modern browser. That's it — no install, no accounts.

## Hosting with GitHub Pages

The same files work unchanged as a website (and hosting is what unlocks offline install):

1. Repo **Settings → Pages**.
2. Deploy from your main branch, root folder.
3. Visit `https://<your-username>.github.io/personal-dashboard/` — including from your phone, where you can **Add to Home Screen**.

**Note:** localStorage is per-origin. The copy you open from disk (`file://`) and the copy on GitHub Pages are *separate* data stores, as is every device/browser. Use **Export** on one and **Import** on the other to move your data.

## Data & privacy

Everything lives in your browser's localStorage under the key `personal-dashboard-v1`. Nothing is ever sent anywhere — the page makes zero network requests. The service worker only caches the app's own files for offline use; it phones no one home.

Because browsers can clear localStorage (storage pressure, "clear site data", private windows), use the **Export** button occasionally to keep a JSON backup.

## Dev notes

- The data schema is versioned (`schemaVersion` inside the stored object, currently **3**). Format changes go through the `migrate()` function in `index.html`, which is idempotent and back-fills new fields — so old (v1/v2) backups stay importable and gain the newer fields automatically (task `stage`/`subtasks`/`secondsLogged`/`estimateMinutes`/`cue`/`goalId`, habit `cue`, goal `parentId`/`horizon`/`confidence`/`sr`, idea `sr`, per-project `view`, the `timeLog`, and the expanded `settings`).
- State flow is deliberately simple: every mutation does *update state → save() → re-render the active view*. Events are delegated through `data-action` attributes — no per-element listeners to re-bind after renders.
- The view router (`renderAll`) switches between the fixed tabs (`home`, `today`, `calendar`, `stats`) and one view per project id; the active tab is persisted in `settings.lastActiveTab`.
- The focus timer ticks from a single `setInterval`; only phase transitions are persisted, so a reload mid-session resumes from the wall-clock end time.

### Testing

There's no build step, but the inline logic is covered by a headless [jsdom](https://github.com/jsdom/jsdom) smoke suite that boots the real `index.html` and exercises every major flow (project/task/subtask CRUD, Kanban stage sync, habit heatmap backfill, Today focus picks, calendar, stats, theme, undo, the Pomodoro logging path, the review wizard, and v1→v2 migration). To run it:

```sh
npm install jsdom        # one-off
node test-dash.mjs       # see the project for the harness
```
