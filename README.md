# Personal Dashboard

A single-file personal dashboard: projects, tasks, habits, goals, ideas — runs anywhere, owns nothing.

The entire app is one `index.html` with no dependencies, no build step, and no server. Open it in a browser and start using it.

## Features

- **Home overview** — stats, today's habits, upcoming tasks across all projects, goals, quick links, ideas inbox, and a scratchpad.
- **One tab per project** — each project has its own description, status, task list, notes, and links. Projects can be edited, archived, restored, and deleted.
- **Tasks** — priority (high/med/low) and optional due dates, with overdue highlighting. The home page rolls up the top open tasks across every project, sorted by due date then priority.
- **Ideas inbox** — type an idea and hit Enter. Promote any idea into a full project with one click.
- **Habit tracker** — daily check-offs with streak counters (an unchecked *today* doesn't break the streak until the day is over).
- **Goals** — progress bars driven by either a manual percentage or a checklist of milestones, optionally linked to a project.
- **Quick links** — pinned favorites on the home page; per-project links on each project tab.
- **Export / Import** — download all data as JSON, restore it anywhere.

## Usage

Clone or download this repo, then open `index.html` in any modern browser. That's it — no install, no accounts.

## Hosting with GitHub Pages

The same file works unchanged as a website:

1. Repo **Settings → Pages**.
2. Deploy from your main branch, root folder.
3. Visit `https://<your-username>.github.io/personal-dashboard/` — including from your phone.

**Note:** localStorage is per-origin. The copy you open from disk (`file://`) and the copy on GitHub Pages are *separate* data stores, as is every device/browser. Use **Export** on one and **Import** on the other to move your data.

## Data & privacy

Everything lives in your browser's localStorage under the key `personal-dashboard-v1`. Nothing is ever sent anywhere — the page makes zero network requests.

Because browsers can clear localStorage (storage pressure, "clear site data", private windows), use the **Export** button occasionally to keep a JSON backup.

## Dev notes

- The data schema is versioned (`schemaVersion` inside the stored object). Future format changes go through the `migrate()` function in `index.html`, so old backups stay importable.
- State flow is deliberately simple: every mutation does *update state → save() → re-render the active view*. Events are delegated through `data-action` attributes — no per-element listeners to re-bind after renders.
