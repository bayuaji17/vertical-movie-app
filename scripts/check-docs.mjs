import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const categories = new Set([
  "product",
  "architecture",
  "guides",
  "operations",
  "plans",
  "tasks",
  "templates",
  "design",
]);
const retiredPaths =
  /(?:docs\/)?(?:API_DEVELOPMENT|ARCHITECTURE|AUTH_OPERATIONS|AUTH_REFACTOR_PLAN|DESIGN_SYSTEM|ENVIRONMENT|GLOBAL_RULES|GLOBAL_WORKFLOW|IMPLEMENTATION_PLAN|MEDIA_OPERATIONS|MEDIA_UPLOAD_CONTRACT|PRD|REPOSITORY_CONTEXT|TASK_TEMPLATE|VIDEO_DATA_MODEL|VIDEO_IMPLEMENTATION_PLAN|VIDEO_OPERATIONS|VIDEO_REPOSITORY_CONTEXT)\.md/g;
const external = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

function withoutFences(markdown) {
  let marker;
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const fence = line.match(/^\s{0,3}(\x60{3,}|~{3,})/);
      if (fence) {
        if (!marker) marker = fence[1];
        else if (fence[1][0] === marker[0] && fence[1].length >= marker.length)
          marker = undefined;
        return "";
      }
      return marker ? "" : line;
    })
    .join("\n");
}

function anchors(markdown) {
  const found = new Set(),
    counts = new Map();
  for (const match of withoutFences(markdown).matchAll(
    /^#{1,6}\s+(.+?)(?:\s+#+)?\s*$/gm,
  )) {
    const slug = match[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/<[^>]*>/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, "")
      .replace(/ /g, "-");
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    found.add(slug + (count ? "-" + count : ""));
  }
  for (const match of markdown.matchAll(/\b(?:id|name)=["']([^"']+)["']/g))
    found.add(match[1]);
  return found;
}

export function checkDocumentation(root) {
  root = realpathSync(root);
  const docs = resolve(root, "docs"),
    errors = [],
    markdown = [];
  if (!existsSync(docs))
    return { errors: ["docs/ is missing"], documents: 0, links: 0 };
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = resolve(directory, entry.name),
        path = relative(root, full).split(sep).join("/");
      if (entry.isSymbolicLink()) {
        errors.push(path + ": documentation symlinks are unsupported");
        continue;
      }
      const within = relative(docs, full).split(sep).join("/"),
        segments = within.split("/");
      if (
        segments.length === 1 &&
        entry.name !== "README.md" &&
        !categories.has(entry.name)
      )
        errors.push(path + ": use a documented category");
      if (entry.isDirectory()) {
        if (!categories.has(entry.name) && segments.length === 1) continue;
        if (
          segments.length > 1 &&
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)
        )
          errors.push(path + ": use kebab-case folder names");
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        const validName =
          entry.name === "README.md" ||
          (segments[0] === "design"
            ? /^[a-z0-9][a-z0-9.-]*\.md$/
            : /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
          ).test(entry.name);
        if (!validName)
          errors.push(path + ": use kebab-case Markdown filenames");
        markdown.push(full);
      }
    }
  }
  walk(docs);
  for (const path of ["AGENTS.md", "README.md"]) {
    const full = resolve(root, path);
    if (!existsSync(full))
      errors.push(path + ": required entry point is missing");
    else markdown.push(full);
  }
  if (!existsSync(resolve(docs, "README.md")))
    errors.push("docs/README.md: index is missing");
  const anchorCache = new Map(),
    indexed = new Set();
  let links = 0;
  for (const full of markdown) {
    const path = relative(root, full).split(sep).join("/"),
      raw = readFileSync(full, "utf8");
    const text = withoutFences(raw);
    const targets = [
      ...text.matchAll(
        /!?\[[^\]\n]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*["'])?\)/g,
      ),
    ].map((m) => m[1] ?? m[2]);
    for (const m of text.matchAll(/^\s*\[[^\]\n]+\]:\s*(?:<([^>]+)>|(\S+))/gm))
      targets.push(m[1] ?? m[2]);
    for (const href of targets) {
      if (external.test(href)) continue;
      links++;
      const hash = href.indexOf("#"),
        target = hash < 0 ? href : href.slice(0, hash),
        fragment = hash < 0 ? "" : href.slice(hash + 1);
      let destination, decodedFragment;
      try {
        destination = target
          ? resolve(dirname(full), decodeURIComponent(target))
          : full;
        decodedFragment = decodeURIComponent(fragment);
      } catch {
        errors.push(path + ": invalid URL encoding " + href);
        continue;
      }
      const outside = relative(root, destination);
      if (outside === ".." || outside.startsWith(".." + sep)) {
        errors.push(path + ": link leaves the repository " + href);
        continue;
      }
      if (!existsSync(destination)) {
        errors.push(path + ": missing target " + href);
        continue;
      }
      if (full === resolve(docs, "README.md")) indexed.add(destination);
      if (
        fragment &&
        destination.endsWith(".md") &&
        statSync(destination).isFile()
      ) {
        if (!anchorCache.has(destination))
          anchorCache.set(
            destination,
            anchors(readFileSync(destination, "utf8")),
          );
        if (!anchorCache.get(destination).has(decodedFragment))
          errors.push(path + ": missing anchor " + href);
      }
    }
    // Immutable GitHub URLs preserve historical paths; installed package docs are unrelated.
    const localText = raw
      .replace(/https?:\/\/[^\s<>"\x60]+/g, "")
      .replace(/!?\[[^\]\n]*\](?=\()/g, "");
    for (const match of localText.matchAll(retiredPaths))
      errors.push(path + ": retired documentation path " + match[0]);
  }
  for (const full of markdown) {
    const path = relative(root, full).split(sep).join("/");
    if (!path.startsWith("docs/") || path === "docs/README.md") continue;
    if (
      path.startsWith("docs/design/") &&
      path !== "docs/design/design-system.md"
    )
      continue;
    if (!indexed.has(full))
      errors.push(path + ": canonical document is missing from docs/README.md");
  }
  for (const path of ["apps/api/.env.example", "apps/web/.env.example"]) {
    const full = resolve(root, path);
    if (existsSync(full))
      for (const match of readFileSync(full, "utf8").matchAll(retiredPaths))
        errors.push(path + ": retired documentation path " + match[0]);
  }
  return { errors: [...new Set(errors)], documents: markdown.length, links };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--root"))
    throw new Error("Usage: bun scripts/check-docs.mjs [--root <directory>]");
  const root = args[1] ?? fileURLToPath(new URL("../", import.meta.url));
  const result = checkDocumentation(root);
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Documentation check passed: " +
        result.documents +
        " Markdown files, " +
        result.links +
        " local links/anchors.",
    );
}
