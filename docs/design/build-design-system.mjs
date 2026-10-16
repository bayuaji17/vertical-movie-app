import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createElement } from "../../apps/web/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../apps/web/node_modules/react-dom/server.node.js";
import * as Icons from "../../apps/web/node_modules/@remixicon/react/index.mjs";

const directory = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(directory, "../..");
const source = await Bun.file(resolve(root, "apps/web/src/styles.css")).text();
const block = (selector) => {
  const content = source.match(
    new RegExp(`${selector} \\{([\\s\\S]*?)\\n\\}`),
  )?.[1];
  if (!content) throw new Error(`Missing theme: ${selector}`);
  return Object.fromEntries(
    [...content.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [
      key,
      value.trim(),
    ]),
  );
};
const themes = { light: block(":root"), dark: block("\\.dark") };
const names = Object.keys(themes.light).filter((key) => key !== "radius");
if (names.some((key) => !(key in themes.dark)))
  throw new Error("Incomplete dark theme");
const tokens = {
  source: "apps/web/src/styles.css",
  config: "apps/web/components.json",
  style: "base-rhea",
  baseColor: "neutral",
  theme: "lime",
  approved: "2026-10-03",
  colors: names,
  themes,
  mediaAliases: Object.fromEntries(
    [...source.matchAll(/--color-(media-[\w-]+):\s*var\((--[\w-]+)\);/g)].map(
      ([, alias, value]) => [alias, value],
    ),
  ),
};
await Bun.write(
  resolve(directory, "design-system.tokens.json"),
  `${JSON.stringify(tokens, null, 2)}\n`,
);

const icon = (name) =>
  renderToStaticMarkup(createElement(Icons[name], { "aria-hidden": true }));
const font = async (family, file) =>
  Buffer.from(
    await Bun.file(
      resolve(
        root,
        `apps/web/node_modules/@fontsource-variable/${family}/files/${file}`,
      ),
    ).arrayBuffer(),
  ).toString("base64");
const inter = await font("inter", "inter-latin-wght-normal.woff2");
const heading = await font(
  "space-grotesk",
  "space-grotesk-latin-wght-normal.woff2",
);
const artwork = Buffer.from(
  await Bun.file(
    resolve(root, "apps/web/src/assets/login-artwork.png"),
  ).arrayBuffer(),
).toString("base64");
const themeCSS = Object.entries(themes)
  .map(
    ([mode, values]) =>
      `.${mode}{${Object.entries(values)
        .map(([key, value]) => `--${key}:${value};`)
        .join("")}}`,
  )
  .join("\n");
const button = (text, variant = "", symbol = "") =>
  `<button type="button" class="button ${variant}">${symbol ? icon(symbol) : ""}${text}</button>`;
const panel = (n, title, content, caption = "") =>
  `<section class="panel" aria-labelledby="section-${n}"><h2 id="section-${n}"><span class="number">${String(n).padStart(2, "0")}</span>${title}</h2>${content}${caption ? `<p class="caption">${caption}</p>` : ""}</section>`;
const badge = (text, variant, symbol) =>
  `<span class="badge ${variant}">${icon(symbol)}${text}</span>`;
const feedback = (title, description, kind, action = false) =>
  `<div class="feedback ${kind}">${icon(kind === "success" ? "RiCheckboxCircleLine" : "RiAlertLine")}<div><strong>${title}</strong><p>${description}</p></div>${action ? button("Coba lagi", "tonal") : `<span class="close">${icon("RiCloseLine")}</span>`}</div>`;
const swatches = names
  .map(
    (name) =>
      `<div class="token"><div class="swatch" data-token="${name}" style="background:var(--${name})"></div><div><code>--${name}</code><span class="token-value" data-value="${name}"></span></div></div>`,
  )
  .join("");
const fonts = `<div class="type-columns"><div><p class="eyebrow">SPACE GROTESK · HEADING</p><p class="display">Kelola video<br>vertikal.</p><p class="eyebrow">INTER · BODY</p><p class="body-example">Cerita yang mudah ditemukan.</p><p class="muted">Unggah, siapkan, dan terbitkan video dari satu dashboard.</p></div><div class="type-scale">${[
  [48, "Display"],
  [36, "Heading"],
  [24, "Section"],
  [16, "Body"],
  [14, "UI"],
  [12, "Caption"],
]
  .map(([size, name]) => `<p><b>${size}</b> / ${name}</p>`)
  .join("")}</div></div>`;
const spacing = `<p>Spasi · grid 4 px</p><div class="spacing">${[4, 8, 12, 16, 24, 32].map((n) => `<div><span style="width:${n * 2}px;height:${n * 2}px"></span><small>${n}</small></div>`).join("")}</div><p>Radius sudut</p><div class="radii">${[10, 18, 24].map((n) => `<div><span style="border-radius:${n}px"></span><small>${n} px</small></div>`).join("")}</div><p class="muted">Base 10 · kontrol 18 · card 24 px</p>`;
const buttons = `<div class="row wrap">${button("Unggah video", "", "RiAddLine")}${button("Simpan", "secondary", "RiSaveLine")}${button("Pratinjau", "outline", "RiPlayLine")}${button("Kembali", "ghost", "RiArrowLeftLine")}${button("Hapus", "destructive", "RiDeleteBinLine")}${button("Lihat semua →", "link")}</div><div class="divider"></div><p>State primary</p><div class="row wrap">${button("Masuk")}${button("Focus", "focused")}<button type="button" class="button" disabled>Disabled</button>${button("Memproses…", "", "RiLoaderLine")}</div><p class="muted">xs 24 · sm 28 · default 32 · lg 36 px</p>`;
const input = `<div class="fields"><label>Email<div class="input">${icon("RiMailLine")}<span class="muted">admin@example.com</span></div></label><label>Password<div class="input">${icon("RiLockLine")}••••••••••••</div><small>Minimal 12 karakter.</small></label><div class="row"><label>Email (invalid)<div class="input invalid">${icon("RiMailLine")}user@</div><small class="error-text">Email tidak valid.</small></label><label>Email (disabled)<div class="input disabled">${icon("RiMailLine")}<span class="muted">admin@example.com</span></div></label></div></div>`;
const iconNames = [
  "RiPlayLine",
  "RiFilmLine",
  "RiMailLine",
  "RiLockLine",
  "RiUpload2Line",
  "RiSearchLine",
  "RiSettings3Line",
  "RiArrowRightLine",
  "RiMoreLine",
];
const iconPanel =
  [16, 20, 24]
    .map(
      (n) =>
        `<div class="icon-row" style="--icon-size:${n}px"><small>${n} px</small>${iconNames.map(icon).join("")}</div>`,
    )
    .join("") +
  `<div class="divider"></div><p>Contoh aksi</p><div class="row">${button("", "outline", "RiSettings3Line")}${button("Tonton", "", "RiPlayFill")}${button("", "outline", "RiMoreLine")}<span class="avatar">A</span></div>`;
const status = `<div class="status-grid">${badge("Draf", "neutral", "RiFileTextLine")}${badge("Menunggu", "neutral", "RiTimeLine")}${badge("Diproses", "neutral", "RiLoopRightLine")}${badge("Siap", "success", "RiCheckboxCircleLine")}${badge("Terbit", "outline", "RiCheckboxCircleLine")}${badge("Gagal", "error", "RiAlertLine")}</div><div class="progress-label"><span>Diproses</span><strong>68%</strong></div><div class="progress"><span></span></div>`;
const alerts =
  feedback(
    "Video perlu perhatian",
    "Terjadi masalah saat memproses video.",
    "error",
    true,
  ) +
  `<small class="muted">Toast · top center</small>` +
  feedback("Login berhasil", "Anda masuk ke dashboard.", "success") +
  feedback("Login gagal", "Periksa email dan password.", "error");
const navigation = `<div class="nav-columns"><nav class="sidebar" aria-label="Contoh navigasi"><small>Konten</small><div class="selected">${icon("RiHomeLine")}Dashboard</div><div>${icon("RiFilmLine")}Video</div><div>${icon("RiStackLine")}Series</div><div class="divider"></div><small>Sistem</small><div>${icon("RiSettings3Line")}Pengaturan</div></nav><div><p>Breadcrumb</p><p class="muted">${icon("RiHomeLine")} Admin / Video</p><p>Tabs</p><div class="tabs"><span class="active">Semua</span><span>Draf</span><span>Terbit</span></div></div></div>`;
const media = `<div class="media-columns"><div class="art-card"><img src="data:image/png;base64,${artwork}" alt="Ilustrasi dua poster film vertikal"/><strong>Pratinjau konten</strong><span class="muted">Cover vertikal · 9:16</span></div><div class="content-types"><p>Jenis konten</p>${badge("Video", "neutral", "RiFilmLine")}${badge("Movie", "neutral", "RiMovieLine")}${badge("Episode", "neutral", "RiStackLine")}</div></div>`;
const loginMini = (mobile) =>
  `<div class="mini-login ${mobile ? "mobile" : ""}"><header><span class="logo-mini">${icon("RiPlayFill")}</span>Vertical Movie</header><div class="mini-columns">${mobile ? "" : `<aside><h3>Kelola video<br>vertikal.</h3><img src="data:image/png;base64,${artwork}" alt=""/></aside>`}<div><h3>Masuk admin</h3><small>Email</small><div class="mini-input">admin@example.com</div><small>Password</small><div class="mini-input">••••••••</div><div class="mini-button">Masuk →</div></div></div></div>`;
const responsive = `<div class="responsive-demo"><div><p>Desktop ≥ 1024</p>${loginMini(false)}</div><div><p>Mobile &lt; 1024</p>${loginMini(true)}</div></div><p class="muted">Container 1152 · gutter 24 / 32 px · form terpusat pada layar kecil</p>`;
const comparison = ["light", "dark"]
  .map(
    (mode) =>
      `<div><p>${mode === "light" ? "Light" : "Dark"} mode</p><div class="comparison ${mode}"><span class="badge success">${icon("RiCheckboxCircleLine")}</span><strong>Video siap</strong><p class="muted">Metadata lengkap.</p>${button("Pratinjau", "outline")}${button("Terbitkan")}</div></div>`,
  )
  .join("");
const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vertical Movie · Design System Final</title><style>
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${inter});font-weight:100 900;font-display:swap}@font-face{font-family:Heading;src:url(data:font/woff2;base64,${heading});font-weight:300 700;font-display:swap}
${themeCSS}
*{box-sizing:border-box}body{margin:0;font-family:Inter,sans-serif;background:#e8e8e8}button{font:inherit;cursor:pointer}svg{width:20px;height:20px;flex-shrink:0;vertical-align:middle}p{margin:0 0 12px;line-height:1.5}small{font-size:12px;line-height:1.5}code{font-family:ui-monospace,monospace}.toolbar{display:flex;justify-content:center;align-items:center;gap:20px;padding:14px;background:#fff;color:#171717}.toolbar button{padding:8px 16px;border:1px solid #ddd;border-radius:10px;background:#fff}.toolbar button[aria-pressed=true]{background:#171717;color:#fff}.board{background:var(--background);color:var(--foreground);padding:40px;width:100%;max-width:1920px;margin:auto}.board-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.brand{display:flex;align-items:center;gap:20px}.logo{display:grid;place-items:center;width:60px;height:60px;border-radius:18px;background:var(--primary);color:var(--primary-foreground)}.logo svg{width:34px;height:34px}.brand strong{font-family:Heading;font-size:28px}.title{border-left:1px solid var(--border);padding-left:24px;margin-left:8px}.title h1{font-family:Heading;font-size:38px;line-height:1.1;margin:0 0 6px}.title p{margin:0;color:var(--muted-foreground)}.header-pills{display:flex;gap:8px}.pill{padding:8px 12px;border:1px solid var(--border);border-radius:99px;font-size:13px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.panel{background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:24px;padding:24px;display:flex;flex-direction:column;gap:12px;min-width:0}.panel h2{font-family:Heading;font-size:20px;font-weight:600;display:flex;align-items:center;gap:12px;margin:0 0 8px}.number{font-family:Inter;font-size:12px;border:1px solid var(--border);padding:5px 8px;border-radius:8px}.palette{grid-column:1/-1}.palette-header{display:flex;align-items:center;justify-content:space-between}.palette-header p{font-size:13px;color:var(--muted-foreground)}.tokens{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:16px}.token{display:flex;flex-direction:column;gap:8px;min-width:0}.swatch{height:52px;border-radius:12px;border:1px solid color-mix(in oklch,var(--foreground) 15%,transparent)}.token code{display:block;font-size:12px;font-weight:600}.token-value{display:block;font-family:ui-monospace,monospace;font-size:10px;color:var(--muted-foreground);margin-top:4px;overflow-wrap:anywhere}.caption{color:var(--muted-foreground);font-size:12px;margin:auto 0 0;padding-top:10px}.muted,.eyebrow{color:var(--muted-foreground)}.eyebrow{font-size:10px;font-weight:600;letter-spacing:.08em;margin-bottom:8px}.type-columns{display:grid;grid-template-columns:1fr 95px;gap:18px}.display{font-family:Heading;font-size:36px;line-height:1.08;font-weight:600;letter-spacing:-1px;margin-bottom:26px}.body-example{font-size:19px;line-height:1.3}.type-columns .muted{font-size:13px}.type-scale{border-left:1px solid var(--border);padding-left:14px;font-size:12px;color:var(--muted-foreground)}.spacing{display:flex;align-items:end;gap:18px;margin:4px 0 14px}.spacing>div,.radii>div{display:flex;flex-direction:column;align-items:center;gap:8px}.spacing span{display:block;background:var(--muted)}.spacing small,.radii small{color:var(--muted-foreground)}.radii{display:flex;justify-content:space-between;gap:16px}.radii span{display:block;width:90px;height:48px;border:1px solid var(--border);background:var(--muted)}.row{display:flex;align-items:center;gap:12px}.wrap{flex-wrap:wrap}.button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border:1px solid transparent;border-radius:18px;background:var(--primary);color:var(--primary-foreground);font-size:14px;font-weight:500;white-space:nowrap}.button svg{width:16px;height:16px}.button.secondary{background:var(--secondary);color:var(--secondary-foreground)}.button.outline{background:var(--background);border-color:var(--border);color:var(--foreground)}.button.ghost{background:transparent;color:var(--foreground)}.button.link{background:transparent;color:var(--primary)}.light .button.link{color:var(--primary-foreground)}.button.destructive{background:color-mix(in srgb,var(--destructive) 10%,var(--card));color:var(--destructive)}.dark .button.destructive{background:color-mix(in srgb,var(--destructive) 20%,var(--card))}.button:disabled,.disabled{opacity:.5}.button.focused{border-color:var(--ring);box-shadow:0 0 0 3px color-mix(in oklch,var(--ring) 30%,transparent)}.divider{height:1px;background:var(--border);margin:12px 0}.fields{display:flex;flex-direction:column;gap:16px}label{font-size:13px;display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}.input{display:flex;align-items:center;gap:8px;background:color-mix(in oklch,var(--input) 50%,transparent);border:1px solid transparent;border-radius:18px;min-height:36px;padding:6px 12px;font-size:12px;overflow:hidden}.input svg{width:16px;height:16px;color:var(--muted-foreground)}label small{color:var(--muted-foreground)}.input.invalid{border-color:var(--destructive);color:var(--destructive);background:color-mix(in srgb,var(--destructive) 8%,var(--card))}.error-text{color:var(--destructive)}.icon-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0}.icon-row svg{width:var(--icon-size);height:var(--icon-size)}.icon-row small{color:var(--muted-foreground);width:38px;flex-shrink:0}.avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--muted);font-size:18px}.status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.badge{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:18px;padding:8px 10px;font-size:13px;white-space:nowrap}.badge svg{width:18px;height:18px}.neutral{background:var(--secondary);color:var(--secondary-foreground)}.badge.outline{border-color:var(--border);color:var(--foreground)}.success{background:color-mix(in srgb,var(--primary) 12%,var(--card));border-color:color-mix(in srgb,var(--primary) 30%,var(--border));color:color-mix(in srgb,var(--primary) 35%,var(--foreground))}.error{background:color-mix(in srgb,var(--destructive) 10%,var(--card));border-color:color-mix(in srgb,var(--destructive) 30%,var(--border));color:color-mix(in srgb,var(--destructive) 85%,var(--foreground))}.progress-label{display:flex;justify-content:space-between;margin:40px 0 0;font-size:13px}.progress{height:12px;background:var(--muted);border-radius:99px;overflow:hidden}.progress span{display:block;width:68%;height:100%;background:var(--primary);border-radius:inherit}.feedback{display:flex;align-items:center;gap:12px;border-width:1px;border-style:solid;border-radius:18px;padding:14px}.feedback>svg{width:24px;height:24px}.feedback>div{flex:1;min-width:0}.feedback strong{font-size:13px;font-weight:600}.feedback p{font-size:11px;color:inherit;margin:3px 0 0}.feedback .tonal{background:transparent;color:inherit;border-color:currentColor;font-size:11px}.close{opacity:.75}.close svg{width:16px;height:16px}.nav-columns{display:grid;grid-template-columns:1fr 1fr;gap:20px}.sidebar{padding:14px;border:1px solid var(--sidebar-border);border-radius:18px;background:var(--sidebar);color:var(--sidebar-foreground)}.sidebar>div:not(.divider){display:flex;align-items:center;gap:8px;padding:9px 8px;font-size:13px;border-radius:10px}.sidebar small{color:var(--muted-foreground)}.sidebar .selected{background:var(--sidebar-accent);color:var(--sidebar-accent-foreground)}.nav-columns p{font-size:12px}.nav-columns>div{padding-top:8px}.tabs{display:flex;gap:4px;padding:4px;background:var(--muted);border-radius:12px;font-size:11px}.tabs span{padding:8px}.tabs .active{background:var(--card);border-radius:9px;box-shadow:0 1px 3px #0001}.media-columns{display:grid;grid-template-columns:1fr 115px;gap:16px}.art-card{display:flex;flex-direction:column;gap:8px;align-items:center;font-size:13px}.art-card img{height:205px;width:100%;object-fit:contain;background:var(--muted);border-radius:18px}.art-card span{font-size:11px}.content-types{display:flex;flex-direction:column;gap:12px}.content-types p{font-size:12px}.responsive-demo{display:grid;grid-template-columns:1.65fr 1fr;gap:14px}.responsive-demo p{font-size:12px}.mini-login{background:var(--background);border:1px solid var(--border);padding:12px;border-radius:12px;height:220px}.mini-login header{display:flex;align-items:center;gap:6px;font-size:7px;font-weight:600;margin-bottom:20px}.logo-mini{background:var(--primary);color:var(--primary-foreground);padding:3px;border-radius:5px}.logo-mini svg{width:10px;height:10px}.mini-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.mini-login.mobile .mini-columns{grid-template-columns:1fr}.mini-login h3{font-family:Heading;font-size:10px;margin:0 0 12px}.mini-login img{width:100%;height:128px;object-fit:contain;background:var(--muted);border-radius:6px}.mini-login small{font-size:6px}.mini-input{font-size:5px;background:var(--input);padding:6px;margin:4px 0 12px;border-radius:6px}.mini-button{font-size:7px;background:var(--primary);color:var(--primary-foreground);padding:6px;text-align:center;border-radius:6px}.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.comparison-grid>div>p{font-size:12px}.comparison{background:var(--background);color:var(--foreground);border:1px solid var(--border);padding:16px;border-radius:18px;display:flex;flex-direction:column;gap:10px}.comparison>.badge{align-self:start;padding:8px}.comparison strong{font-size:14px}.comparison p{font-size:11px;margin:0}.board-footer{display:flex;justify-content:space-between;border-top:1px solid var(--border);margin-top:24px;padding-top:16px;font-size:12px;color:var(--muted-foreground)}.board-footer strong{color:var(--foreground)}
@media(min-width:1200px){.typography{grid-column:span 2}.typography .type-columns{grid-template-columns:1fr 140px}.typography .display{font-size:48px}.typography .body-example{font-size:24px}}
@media(max-width:1199px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tokens{grid-template-columns:repeat(4,minmax(0,1fr))}.board-header{align-items:start;gap:20px;flex-direction:column}.header-pills{flex-wrap:wrap}}
@media(max-width:639px){.board{padding:20px}.grid{grid-template-columns:1fr;gap:16px}.tokens{grid-template-columns:repeat(2,minmax(0,1fr))}.panel{padding:18px}.palette-header{display:block}.brand{gap:12px;flex-wrap:wrap}.brand strong{font-size:22px}.title{margin:0;padding:0;border:0;flex-basis:100%}.title h1{font-size:30px}.toolbar{gap:8px;flex-wrap:wrap;font-size:12px}.board-footer{flex-direction:column;gap:8px}.spacing{gap:12px}.nav-columns{gap:12px}.radii span{width:72px}.icon-row{gap:4px}.icon-row svg{max-width:22px}.feedback{padding:12px;gap:8px}.feedback .tonal{padding:0 8px}.palette-header p{font-size:12px}}
.token code{overflow-wrap:anywhere}
@media(max-width:639px){.status-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.icon-row{flex-wrap:wrap;justify-content:start}.spacing{gap:8px}.radii{gap:12px}.nav-columns,.comparison-grid{grid-template-columns:1fr}}
@media print{.toolbar{display:none}.board{max-width:none}}
</style></head><body><nav class="toolbar" aria-label="Tema referensi"><span>Referensi final · bukan halaman aplikasi</span><button type="button" data-mode="light" aria-pressed="true">Light mode</button><button type="button" data-mode="dark" aria-pressed="false">Dark mode</button></nav><main id="board" class="board light"><header class="board-header"><div class="brand"><span class="logo">${icon("RiPlayFill")}</span><strong>Vertical Movie</strong><div class="title"><h1>Design System</h1><p>Fondasi visual & komponen UI · Final</p></div></div><div class="header-pills"><span class="pill">shadcn/ui</span><span class="pill">Base UI · Rhea</span><span class="pill" id="mode-label">Light · Neutral + Lime</span><span class="pill">3 Oktober 2026</span></div></header><div class="grid"><section class="panel palette" aria-labelledby="section-1"><div class="palette-header"><h2 id="section-1"><span class="number">01</span>Warna semantik · ${names.length} token</h2><p>Nilai persis dari apps/web/src/styles.css · muted = permukaan, muted-foreground = teks</p></div><div class="tokens">${swatches}</div></section><div class="panel typography" aria-labelledby="section-2"><h2 id="section-2"><span class="number">02</span>Tipografi</h2>${fonts}<p class="caption">Inter Variable · Space Grotesk Variable · heading semibold, body regular</p></div>${panel(3, "Spasi & bentuk", spacing, "Grid 4 px · --radius: 0.625rem · turunan shadcn")}${panel(4, "Button", buttons, "Gunakan variant bawaan · form login 44 px")}${panel(5, "Field & InputGroup", input, "Label, helper, invalid & disabled · contoh visual")}${panel(6, "Ikon & aksi", iconPanel, "Remixicon outline · target aksi mobile ≥ 44 px")}${panel(7, "Status konten", status, "Spesifikasi visual · teks + ikon, bukan warna saja")}${panel(8, "Alert & Toast", alerts, "Tint sukses/error sama dengan Status konten · tanpa disc ikon")}${panel(9, "Navigasi", navigation, "Sidebar, breadcrumb & tabs · pola produk")}${panel(10, "Card & media", media, "Komposisi Card · pertahankan rasio tanpa mengubah isi media")}${panel(11, "Layout responsif", responsive, "Login existing · mockup pola visual")}${panel(12, "Light / Dark", `<div class="comparison-grid">${comparison}</div>`, "Nama token sama · nilai tema berbeda")}</div><footer class="board-footer"><span><strong>Kontras terbaca · Fokus terlihat · Status memakai teks + ikon</strong><br>Token final · pola navigasi/konten/feedback adalah spesifikasi visual</span><span>Source: styles.css · components.json<br>Dark base #1E201E · light base neutral</span></footer></main><script>
const themes=${JSON.stringify(themes)};
window.setDesignTheme=function(mode){if(!themes[mode])throw new Error('Invalid theme');document.getElementById('board').className='board '+mode;document.getElementById('mode-label').textContent=mode==='dark'?'Dark · Charcoal #1E201E':'Light · Neutral + Lime';document.querySelectorAll('[data-value]').forEach(el=>{el.textContent=themes[mode][el.dataset.value]});document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));document.documentElement.dataset.mode=mode;};
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>window.setDesignTheme(el.dataset.mode)));
window.setDesignTheme(new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light');
</script></body></html>`;
await Bun.write(resolve(directory, "design-system-final.html"), html);
const table = `| Variabel | Light (:root) | Dark (.dark) |\n| --- | --- | --- |\n${names.map((name) => `| \`--${name}\` | \`${themes.light[name]}\` | \`${themes.dark[name]}\` |`).join("\n")}\n`;
const mediaTable = `| Alias Tailwind | Variabel runtime player |\n| --- | --- |\n${Object.entries(
  tokens.mediaAliases,
)
  .map(([alias, value]) => `| \`--color-${alias}\` | \`${value}\` |`)
  .join("\n")}\n`;
await Bun.write(
  resolve(directory, "design-system.colors.md"),
  `# Atlas warna final\n\nDihasilkan dari \`apps/web/src/styles.css\` menggunakan \`bun docs/design/build-design-system.mjs\`. Seluruh ${names.length} variabel warna shadcn dengan nilai literal CSS.\n\n${table}\n## Alias warna media\n\n${Object.keys(tokens.mediaAliases).length} alias tambahan di \`@theme inline\` bergantung pada theme runtime Video.js di dalam player. Variabel ini tidak mempunyai nilai literal pada \`:root\`/\`.dark\` aplikasi; jangan menganggapnya token global atau mewarnai swatch tanpa scope player. Alias dipertahankan tanpa perubahan.\n\n${mediaTable}`,
);
console.log(
  `Generated ${names.length} color tokens per theme, HTML board and Markdown atlas.`,
);
