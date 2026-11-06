// Turns `content/` into static files the site fetches: run before dev and build.
// Writes to `public/content/`, which is generated and not committed.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, parse, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const frontend = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(frontend, "..", "content");
const out = join(frontend, "public", "content");

const IMAGE_SUFFIXES = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function title(stem) {
  const words = stem.replace(/[-_]+/g, " ").trim();
  return words.slice(0, 1).toUpperCase() + words.slice(1);
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true })
    .map((entry) => join(root, entry))
    .filter((path) => statSync(path).isFile());
}

function listAssets() {
  const root = join(source, "assets");
  return filesUnder(root)
    .map((path) => ({ path, parts: relative(root, path).split(sep), ...parse(path) }))
    .filter(({ ext, parts }) => IMAGE_SUFFIXES.has(ext.toLowerCase()) && !parts.some((part) => part.startsWith(".")))
    .map(({ path, parts, name, base, ext }) => ({
      path: parts.join(posix.sep),
      name: title(name),
      filename: base,
      category: parts.length > 1 ? title(parts[0]) : "General",
      format: ext.slice(1).toUpperCase().replace("JPEG", "JPG"),
      bytes: statSync(path).size,
    }))
    .sort((a, b) => compare(a.path, b.path));
}

function loadDocs() {
  const root = join(source, "docs");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((file) => parse(file))
    .filter(({ name, ext }) => ext === ".md" && SLUG.test(name))
    .map(({ name, base }) => {
      const { data, content } = matter(readFileSync(join(root, base), "utf8"));
      return {
        slug: name,
        title: data.title ?? title(name),
        summary: data.summary ?? "",
        icon: data.icon ?? "description",
        order: data.order ?? 100,
        body: content.trim(),
      };
    })
    .sort((a, b) => a.order - b.order || compare(a.title, b.title));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

rmSync(out, { recursive: true, force: true });

const assets = listAssets();
for (const asset of assets) {
  const target = join(out, "assets", ...asset.path.split(posix.sep));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(source, "assets", ...asset.path.split(posix.sep)), target);
}
writeJson(join(out, "assets.json"), assets);

const docs = loadDocs();
writeJson(
  join(out, "docs.json"),
  docs.map(({ body, ...meta }) => meta),
);
for (const doc of docs) writeJson(join(out, "docs", `${doc.slug}.json`), doc);

console.log(`Content: ${assets.length} images, ${docs.length} docs.`);
