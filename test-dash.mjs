/* Headless smoke test for the Personal Dashboard.
 *
 * Boots the real index.html in jsdom, polyfills the few browser APIs jsdom
 * lacks (<dialog> modal methods, AudioContext, Notification), and exercises
 * every major flow. localStorage is the oracle — the app persists state there
 * after each mutation.
 *
 * Run:  npm install jsdom  &&  node test-dash.mjs
 */
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, "index.html"), "utf8");
const STORAGE_KEY = "personal-dashboard-v1";

function polyfill(window) {
  const proto = window.HTMLDialogElement && window.HTMLDialogElement.prototype;
  if (proto) {
    proto.showModal = function () { this.open = true; };
    proto.show = function () { this.open = true; };
    proto.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };
  }
  window.AudioContext = class {
    createOscillator() { return { connect() {}, frequency: {}, start() {}, stop() {}, type: "" }; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
  };
  window.Notification = class { static permission = "default"; static requestPermission() { return Promise.resolve("default"); } };
}

function makeStorage(seed) {
  const m = new Map(seed ? Object.entries(seed) : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) pass++; else { fail++; console.log("  ✗ FAIL:", name); } }

const todayISO = (() => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
})();

// ============================================================
// Main suite: drive the app like a user.
// ============================================================
const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true, beforeParse: polyfill });
const { window } = dom;
const { document } = window;
const getState = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
function clickAction(action, extra = "") {
  const el = document.querySelector(`[data-action="${action}"]${extra}`);
  if (!el) throw new Error("no element for action " + action + extra);
  click(el);
  return el;
}
function submitForm(id, values) {
  const form = document.getElementById(id);
  for (const [k, v] of Object.entries(values)) form.elements[k].value = v;
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}
let s;

ok("app boots, tabs rendered", document.querySelectorAll("#tabs button").length >= 5);
const tabLabels = [...document.querySelectorAll("#tabs button")].map(b => b.textContent.trim());
ok("fixed tabs present", ["Today", "Calendar", "Stats"].every(t => tabLabels.some(l => l.includes(t))));

clickAction("add-project");
submitForm("form-project", { name: "Launch", description: "Ship it", status: "active" });
s = getState();
ok("project created", s.projects.length === 1 && s.projects[0].name === "Launch");
ok("project view=list default", s.projects[0].view === "list");
ok("schema is v2", s.schemaVersion === 2);
const projId = s.projects[0].id;

clickAction("add-task", `[data-id="${projId}"]`);
submitForm("form-task", { title: "Build landing page", priority: "1", dueDate: "2026-06-20", subtasks: "wireframe\ncopy\nQA" });
s = getState();
const taskId = s.tasks[0].id;
ok("task created with subtasks", s.tasks[0].subtasks.length === 3);
ok("task default stage todo", s.tasks[0].stage === "todo");

clickAction("toggle-subtask", `[data-id="${taskId}"][data-sid="${s.tasks[0].subtasks[0].id}"]`);
ok("subtask toggled", getState().tasks[0].subtasks[0].done === true);

clickAction("toggle-task", `[data-id="${taskId}"]`);
s = getState();
ok("task done syncs stage->done", s.tasks[0].done && s.tasks[0].stage === "done" && !!s.tasks[0].completedAt);
clickAction("toggle-task", `[data-id="${taskId}"]`);
ok("task undone syncs stage->todo", !getState().tasks[0].done && getState().tasks[0].stage === "todo");

clickAction("set-project-view", `[data-id="${projId}"][data-view="board"]`);
ok("board has 3 columns", document.querySelectorAll(".board-col").length === 3);
clickAction("stage-next", `[data-id="${taskId}"]`);
ok("stage-next -> doing", getState().tasks[0].stage === "doing");
clickAction("stage-next", `[data-id="${taskId}"]`);
ok("stage-next -> done", getState().tasks[0].stage === "done" && getState().tasks[0].done);
clickAction("set-project-view", `[data-id="${projId}"][data-view="list"]`);

clickAction("switch-tab", `[data-id="home"]`);
clickAction("add-habit");
submitForm("form-habit", { name: "Read" });
const habitId = getState().habits[0].id;
clickAction("toggle-habit", `[data-id="${habitId}"]`);
ok("habit checked today", getState().habits[0].completions.includes(todayISO));
clickAction("habit-detail", `[data-id="${habitId}"]`);
ok("heatmap rendered", document.querySelectorAll(".heat-cell").length >= 53 * 7 - 7);
const heatBtn = document.querySelector('.heat-cell[data-action="heat-toggle"]');
const backfill = heatBtn.dataset.date;
click(heatBtn);
ok("heat-toggle backfills history", getState().habits[0].completions.includes(backfill));
document.getElementById("dlg-habit-detail").close();

clickAction("switch-tab", `[data-id="${projId}"]`);
clickAction("add-task", `[data-id="${projId}"]`);
submitForm("form-task", { title: "Write tests", priority: "2", dueDate: "", subtasks: "" });
const openTaskId = getState().tasks.find(t => t.title === "Write tests").id;
clickAction("switch-tab", `[data-id="today"]`);
ok("today shows 3 focus slots", document.querySelectorAll(".focus-slot").length === 3);
clickAction("focus-add", `[data-id="${openTaskId}"]`);
ok("focus-add records top-3 pick", getState().settings.focus.taskIds.includes(openTaskId));

clickAction("switch-tab", `[data-id="calendar"]`);
ok("calendar 42 cells", document.querySelectorAll(".cal-cell").length === 42);
ok("calendar shows a due chip", !!document.querySelector(".cal-chip"));
clickAction("cal-next"); clickAction("cal-prev");
ok("calendar nav stable", document.querySelectorAll(".cal-cell").length === 42);

clickAction("switch-tab", `[data-id="stats"]`);
ok("stats charts render", document.querySelectorAll(".chart-row").length >= 8);

clickAction("open-settings");
clickAction("set-theme", `[data-id="light"]`);
ok("theme light persisted", getState().settings.theme === "light" && document.documentElement.dataset.theme === "light");
clickAction("set-accent", `[data-accent="#3ddc84"]`);
ok("accent applied", getState().settings.accent === "#3ddc84" && document.documentElement.style.getPropertyValue("--accent") === "#3ddc84");
document.getElementById("dlg-settings").close();

clickAction("switch-tab", `[data-id="today"]`);
const beforeLog = (getState().timeLog || []).length;
clickAction("start-focus", `[data-id="${openTaskId}"]`);
ok("timer active", getState().settings.timer?.phase === "work");
ok("timer widget visible", !!document.getElementById("timer-widget"));
clickAction("timer-skip");
s = getState();
ok("work skip logs full session", s.timeLog.length === beforeLog + 1 && s.timeLog.at(-1).seconds === 25 * 60);
ok("task accrues secondsLogged", s.tasks.find(t => t.id === openTaskId).secondsLogged === 25 * 60);
ok("timer moved to break", s.settings.timer?.phase === "break");
clickAction("timer-stop");
ok("timer cleared, no extra log", getState().settings.timer === null && getState().timeLog.length === beforeLog + 1);

clickAction("switch-tab", `[data-id="${projId}"]`);
const nBefore = getState().tasks.length;
clickAction("del-task", `[data-id="${openTaskId}"]`);
ok("task deleted", getState().tasks.length === nBefore - 1);
ok("undo toast shown", !!document.querySelector('[data-action="toast-undo"]'));
clickAction("toast-undo");
ok("undo restores task", getState().tasks.length === nBefore && getState().tasks.some(t => t.id === openTaskId));

const projTasks = getState().tasks.filter(t => t.projectId === projId).length;
clickAction("delete-project", `[data-id="${projId}"]`);
ok("project + tasks deleted", !getState().projects.some(p => p.id === projId));
clickAction("toast-undo");
s = getState();
ok("undo restores project + tasks", s.projects.some(p => p.id === projId) && s.tasks.filter(t => t.projectId === projId).length === projTasks);

clickAction("open-review");
ok("review opens at step 1", document.getElementById("review-progress").textContent.includes("Step 1"));
clickAction("review-next"); clickAction("review-next"); clickAction("review-next"); clickAction("review-next");
ok("review reaches finish", !!document.querySelector('[data-action="review-finish"]'));
clickAction("review-finish");
ok("review records lastReviewDate", getState().settings.lastReviewDate === todayISO);

// ============================================================
// Migration: a v1 backup should upgrade cleanly to v2.
// ============================================================
const v1 = {
  schemaVersion: 1,
  settings: { lastActiveTab: "home" },
  projects: [{ id: "p_old", name: "Old", description: "", status: "active", notes: "n", links: [], createdAt: "x" }],
  tasks: [{ id: "t_old", projectId: "p_old", title: "legacy", priority: 2, dueDate: null, done: true, completedAt: "2026-01-01T00:00:00Z", createdAt: "x" }],
  ideas: [], habits: [], goals: [], quickLinks: [], scratchpad: "hi",
};
const dom2 = new JSDOM(html, {
  url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true,
  beforeParse(window) {
    polyfill(window);
    Object.defineProperty(window, "localStorage", { value: makeStorage({ [STORAGE_KEY]: JSON.stringify(v1) }), configurable: true });
  },
});
const w2 = dom2.window;
w2.document.querySelector('[data-action="switch-tab"][data-id="today"]').dispatchEvent(new w2.MouseEvent("click", { bubbles: true }));
const migrated = JSON.parse(w2.localStorage.getItem(STORAGE_KEY));
ok("v1 -> schema 2", migrated.schemaVersion === 2);
ok("v1 task gains stage from done", migrated.tasks[0].stage === "done");
ok("v1 task gains subtasks array", Array.isArray(migrated.tasks[0].subtasks));
ok("v1 task gains secondsLogged", migrated.tasks[0].secondsLogged === 0);
ok("v1 project gains view", migrated.projects[0].view === "list");
ok("v1 gains timeLog array", Array.isArray(migrated.timeLog));
ok("v1 settings defaults merged", migrated.settings.theme === "dark" && migrated.settings.pomodoro.workMin === 25);
ok("v1 scratchpad preserved", migrated.scratchpad === "hi");

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
