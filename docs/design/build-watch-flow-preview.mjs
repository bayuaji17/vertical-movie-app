// Regenerates the no-JS fallback inside watch-flow-preview.html.
// The preview renders with JavaScript; hosts that block scripts (for example
// the desktop app preview pane) show this static copy instead. Run from the
// repository root: bun docs/design/build-watch-flow-preview.mjs, then format
// with bunx prettier --write docs/design/watch-flow-preview.html
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("./watch-flow-preview.html", import.meta.url);
const html = readFileSync(file, "utf8");
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .find((code) => code.includes("const I = {"));
if (!js) throw new Error("preview script not found");

const els = {};
const defaults = {
  vp: "390x844",
  theme: "light",
  screen: "browse",
  state: "live",
};
const element = (id) =>
  (els[id] ??= {
    id,
    value: defaults[id] ?? "",
    dataset: {},
    style: { setProperty() {} },
    innerHTML: "",
    textContent: "",
    addEventListener() {},
    focus() {},
    setSelectionRange() {},
  });
globalThis.document = {
  getElementById: element,
  documentElement: { clientWidth: 1500 },
  activeElement: null,
};
globalThis.addEventListener = () => {};
const api = new Function(
  js + ";return { render, loadStates, states, notes }",
)();

const screens = {
  browse: "Browse + search",
  film: "Detail: Film / Standalone",
  series: "Detail: Series",
  "watch-film": "Watch: Film / Standalone",
  "watch-ep": "Watch: Episode",
};
const viewports = [
  ["d", 1440, 900, "Desktop 1440×900"],
  ["m", 390, 844, "Mobile 390×844"],
  ["t", 768, 1024, "Tablet 768×1024"],
];
const frames = [];
const rules = [];
const stateControls = [];
for (const screen of Object.keys(screens)) {
  element("screen").value = screen;
  api.loadStates();
  const list = api.states[screen];
  const radios = list
    .map(([value, label], i) => {
      element("state").value = value;
      api.render();
      frames.push(
        `<div class="fr" data-f="${screen}-${value}">${element("frame").innerHTML.replace(/ id="[^"]*"/g, "")}</div>`,
      );
      rules.push(
        `body:has(#s-${screen}:checked):has(#st-${screen}-${value}:checked) .fr[data-f="${screen}-${value}"]{display:block}`,
      );
      return `<input type="radio" name="st-${screen}" id="st-${screen}-${value}" ${i === 0 ? "checked" : ""}><label for="st-${screen}-${value}">${label}</label>`;
    })
    .join("");
  rules.push(
    `body:has(#s-${screen}:checked) .states[data-for="${screen}"]{display:flex}`,
  );
  stateControls.push(
    `<div class="states" data-for="${screen}"><span>State</span>${radios}</div>`,
  );
}
for (const [id, w, h] of viewports)
  rules.push(
    `body:has(#vp-${id}:checked) .sframe{width:${w}px;height:${h}px;--vh:${h}px}`,
  );
for (const z of [100, 75, 50])
  rules.push(`body:has(#z-${z}:checked) .szoom{zoom:${z / 100}}`);

const group = (name, items, checked) =>
  items
    .map(
      ([id, label]) =>
        `<input type="radio" name="${name}" id="${id}" ${id === checked ? "checked" : ""}><label for="${id}">${label}</label>`,
    )
    .join("");
const block = `<!-- static:start -->
    <div class="static-ui">
      <style>
        .static-ui .ctl{display:flex;flex-wrap:wrap;gap:6px 20px;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid #cfd3cf;font-size:13px;position:sticky;top:0;z-index:10}
        .static-ui .grp,.static-ui .states{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
        .static-ui .grp>span,.static-ui .states>span{color:#5d635d;margin-right:2px}
        .static-ui input[type=radio]{position:absolute;opacity:0;pointer-events:none}
        .static-ui label{padding:4px 10px;border:1px solid #b9beb9;border-radius:6px;background:#fff;cursor:pointer}
        .static-ui input:checked+label{background:#1b1d1b;color:#fff;border-color:#1b1d1b}
        .static-ui input:focus-visible+label{outline:2px solid #d89400;outline-offset:2px}
        .static-ui .states,.static-ui .fr{display:none}
        .static-ui .hint{flex-basis:100%;color:#5d635d}
        .static-ui .sstage{padding:16px;overflow:auto}
        .static-ui .sframe{margin:0 auto}
        ${rules.join("\n        ")}
      </style>
      <div class="ctl">
        <div class="grp"><span>Viewport</span>${group(
          "vp",
          viewports.map(([id, , , l]) => [`vp-${id}`, l]),
          "vp-m",
        )}</div>
        <div class="grp"><span>Theme</span>${group(
          "th",
          [
            ["th-l", "Light"],
            ["th-d", "Dark"],
          ],
          "th-l",
        )}</div>
        <div class="grp"><span>Scale</span>${group(
          "z",
          [
            ["z-100", "100%"],
            ["z-75", "75%"],
            ["z-50", "50%"],
          ],
          "z-100",
        )}</div>
        <div class="grp"><span>Screen</span>${group(
          "screen",
          Object.entries(screens).map(([id, l]) => [`s-${id}`, l]),
          "s-browse",
        )}</div>
        ${stateControls.join("\n        ")}
        <span class="hint">Static view: scripts are disabled in this viewer. Open this file in a browser for the live 300 ms debounce search demo.</span>
      </div>
      <div class="sstage"><div class="szoom"><div class="frame sframe">${frames.join("")}</div></div></div>
    </div>
    <!-- static:end -->`;
const next = html.replace(
  /<!-- static:start -->[\s\S]*?<!-- static:end -->/,
  () => block,
);
writeFileSync(file, next);
console.log("static fallback written:", frames.length, "frames");
