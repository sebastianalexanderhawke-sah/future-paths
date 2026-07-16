#!/usr/bin/env node
/**
 * Dark theme generator.
 *
 * The codebase references its palette as Tailwind literal utilities
 * (`bg-[#f4f4f6]`, `text-zinc-900`) rather than tokens — globals.css is the
 * documented system of record, components carry literals. A real dark theme
 * therefore cannot come from flipping tokens alone. Instead of rewriting
 * every feature component (frozen by product phase constraints), this script
 * scans src/ for every color utility + variant actually in use and emits
 * `src/app/dark-theme.css`: unlayered `.dark …` overrides that win over
 * Tailwind's layered utilities by cascade-layer rules, remapping the light
 * palette onto its dark equivalent.
 *
 * Safety property: any color utility found in source that has no entry in
 * the mapping (and is not explicitly KEEP) fails the build of this file, so
 * the dark theme can never silently miss a new color.
 *
 * Run: node scripts/generate-dark-theme.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");
const OUT = path.resolve(process.cwd(), "src/app/dark-theme.css");

/* ── Dark palette ───────────────────────────────────────────────────────── */
// Neutral ladder (cool, zinc-hued to match the light system's temperament).
const D = {
  canvas: "#131316",
  surface: "#1c1c21",
  surfaceMuted: "#26262d",
  chip: "#2c2c34",
  chipHover: "#34343c",
  hairline: "#2a2a31",
  border: "#34343c",
  borderStrong: "#414149",
  borderHover: "#4a4a52",
  borderFocus: "#55555e",
  inkPrimary: "#f0f0f3",
  inkStrong: "#d3d3d9",
  inkStrongHover: "#e6e6eb",
  ink555: "#bcbcc4",
  inkSecondary: "#a9a9b3",
  ink777: "#9b9ba5",
  ink888: "#8e8e98",
  inkTertiary: "#83838d",
  inkQuiet: "#757580",
  inkFaint: "#6d6d77",
  inkGhost: "#5d5d67",
  actionFill: "#ececf0",
  actionFillHover: "#d9d9df",
  actionText: "#17181b",
  // families — interactive text lightened to keep AA on dark surfaces
  indigoText: "#8f9bf7",
  indigoTextHover: "#a7b1f8",
  indigoSoft: "#232647",
  indigoBorder: "#3a4076",
  violetText: "#b39af9",
  violetTextHover: "#c3aefb",
  violetSoft: "#272247",
  amberText: "#edb14d",
  amberTextDeep: "#f5d08c",
  amberSoft: "#2d2414",
  amberBorder: "#4d3d1c",
  emeraldText: "#3ecf94",
  emeraldTextHover: "#5fe0ac",
  emeraldSoft: "#12291f",
  roseText: "#fb7185",
  roseTextHover: "#fda4af",
  redText: "#f87171",
  redTextSoft: "#fa8a8a",
  redSoft: "#331b1e",
  redBorder: "#55262c",
};

/* ── Mapping: `${prop}|${color}` → declarations ─────────────────────────── */
// prop is the utility prefix (bg, text, border, divide, ring, from, via, to,
// fill, stroke). color is the literal (lowercased hex incl. brackets) or the
// named Tailwind color. Values are CSS declaration objects.
const bg = (v) => ({ "background-color": v });
const tx = (v) => ({ color: v });
const bd = (v) => ({ "border-color": v });

const MAP = {
  /* canvas / surfaces */
  "bg|white": bg(D.surface),
  "bg|white/85": bg("rgb(28 28 33 / 0.85)"),
  "bg|[#f4f4f6]": bg(D.canvas),
  "bg|[#f5f5f5]": bg(D.surfaceMuted),
  "bg|[#f7f7f9]": bg(D.surfaceMuted),
  "bg|[#fafafa]": bg(D.surfaceMuted),
  "bg|zinc-50": bg(D.surfaceMuted),
  "bg|zinc-100": bg(D.chip),
  "bg|zinc-200/50": bg("rgb(58 58 66 / 0.5)"),
  "bg|[#ececf0]": bg(D.chip),
  "bg|[#e8e8ee]": bg(D.chip),
  "bg|[#f0f0f4]": bg(D.chip),

  /* action fills — ink buttons become light-on-dark, so the paired
     `text-white` on the same element is overridden here too */
  "bg|[#111]": { ...bg(D.actionFill), color: D.actionText },
  "bg|[#111111]": { ...bg(D.actionFill), color: D.actionText },
  "bg|zinc-900": { ...bg(D.actionFill), color: D.actionText },
  "bg|zinc-700": { ...bg(D.actionFillHover), color: D.actionText },
  "bg|[#333333]": { ...bg(D.actionFillHover), color: D.actionText },

  /* family soft surfaces */
  "bg|[#eef2ff]": bg(D.indigoSoft),
  // Emerging-situation callout: the indigo soft surface at its 60% veil.
  "bg|[#eef2ff]/60": bg("rgb(35 38 71 / 0.6)"),
  "bg|[#f5f3ff]": bg(D.violetSoft),
  "bg|[#f8f7ff]": bg(D.violetSoft),
  "bg|[#f5f5ff]": bg(D.violetSoft),
  "bg|[#fffbeb]": bg(D.amberSoft),
  "bg|[#fff7ed]": bg(D.amberSoft),
  "bg|amber-50": bg(D.amberSoft),
  "bg|[#ecfdf5]": bg(D.emeraldSoft),
  "bg|[#fef2f2]": bg(D.redSoft),
  "bg|red-50": bg(D.redSoft),

  /* ink ladder */
  "text|[#111]": tx(D.inkPrimary),
  "text|[#111111]": tx(D.inkPrimary),
  "text|zinc-900": tx(D.inkPrimary),
  "text|zinc-800": tx(D.inkStrong),
  "text|[#333333]": tx(D.inkStrong),
  "text|[#3f3f46]": tx(D.inkStrong),
  "text|zinc-700": tx(D.inkStrongHover),
  "text|[#555555]": tx(D.ink555),
  "text|[#666666]": tx(D.inkSecondary),
  "text|zinc-600": tx(D.inkSecondary),
  "text|[#777777]": tx(D.ink777),
  "text|[#6b6b76]": tx(D.ink777),
  "text|[#888888]": tx(D.ink888),
  "text|[#6b6b6b]": tx(D.ink888), // AA replacement for #888888
  "text|[#999999]": tx(D.inkTertiary),
  "text|[#707070]": tx(D.inkTertiary), // AA replacement for #999999/#777777
  "text|[#767676]": tx(D.inkTertiary), // AA replacement for #bbbbbb (placeholders)
  "text|[#9a9aa2]": tx(D.inkTertiary),
  "text|zinc-500": tx(D.inkTertiary),
  "text|[#6b7280]": tx(D.inkTertiary),
  "text|[#71717a]": tx(D.inkTertiary),
  "text|[#9ca3af]": tx(D.inkQuiet),
  "text|[#a1a1aa]": tx(D.inkQuiet),
  "text|zinc-400": tx(D.inkQuiet),
  "text|[#aab0bb]": tx(D.inkQuiet),
  "text|[#aaaaaa]": tx(D.inkFaint),
  "text|[#b3b3bb]": tx(D.inkFaint),
  "text|[#bbbbbb]": tx(D.inkGhost),
  "text|[#cccccc]": tx(D.inkGhost),
  "text|[#c9c9d1]": tx(D.inkGhost),
  "text|[#d4d4d8]": tx(D.inkGhost),
  "text|zinc-300": tx(D.inkGhost),

  /* borders & hairlines */
  "border|[#f5f5f5]": bd(D.hairline),
  "border|[#f0f0f0]": bd(D.hairline),
  "border|[#f0f0f2]": bd(D.hairline),
  "border|[#f2f2f4]": bd(D.hairline),
  "border|[#f2f2f5]": bd(D.hairline),
  "border|[#f7f7f9]": bd(D.hairline),
  "border|[#f7f7f8]": bd(D.hairline),
  "border|[#eeeef2]": bd(D.hairline),
  "border|[#eeeeee]": bd(D.hairline),
  "border|[#ececec]": bd(D.hairline),
  "border|[#ececf0]": bd(D.hairline),
  "border|zinc-100": bd(D.hairline),
  "border|[#e5e5e5]": bd(D.border),
  "border|[#e2e2e8]": bd(D.border),
  "border|zinc-200": bd(D.border),
  "border|zinc-300": bd(D.borderStrong),
  "border|[#d4d4d8]": bd(D.borderStrong), // spinner track on light surfaces
  "border|zinc-400": bd(D.borderFocus),
  // The onDark spinner sits on action fills, which are LIGHT in dark mode —
  // its track flips to the action-text ink at the same 30% veil.
  "border|white/30": bd("rgb(23 24 27 / 0.3)"),
  "border|[#999999]": bd(D.borderFocus),
  "border|[#707070]": bd(D.borderFocus), // AA replacement for #999999
  "border|white": bd(D.surface),
  "border|zinc-900": bd(D.actionFill),
  "border|[#111]": bd(D.actionFill),
  "divide|zinc-100": bd(D.hairline),
  "divide|zinc-200": bd(D.border),
  "divide|[#f0f0f0]": bd(D.hairline),
  "divide|[#f5f5f5]": bd(D.hairline),
  "divide|[#f7f7f8]": bd(D.hairline),

  /* rings */
  "ring|zinc-900": { "--tw-ring-color": D.actionFill },
  "ring|zinc-500": { "--tw-ring-color": D.inkQuiet },

  /* family interactive text */
  "text|[#4f46e5]": tx(D.indigoText),
  "text|[#6366f1]": tx(D.indigoText),
  "text|[#7c3aed]": tx(D.violetText),
  "text|[#8b5cf6]": tx(D.violetText),
  "text|[#b45309]": tx(D.amberText),
  "text|amber-700": tx(D.amberText),
  "text|[#d97706]": tx(D.amberText),
  "text|amber-900": tx(D.amberTextDeep),
  "text|[#047857]": tx(D.emeraldText),
  "text|emerald-700": tx(D.emeraldText),
  "text|emerald-600": tx(D.emeraldText),
  "text|[#10b981]": tx(D.emeraldText),
  "text|[#15803d]": tx(D.emeraldText),
  "text|[#f43f5e]": tx(D.roseText),
  "text|rose-500": tx(D.roseText),
  "text|rose-700": tx(D.roseText),
  "text|[#e11d48]": tx(D.roseText),
  "text|red-700": tx(D.redText),
  "text|red-600": tx(D.redText),
  "text|red-500": tx(D.redText),
  "text|red-400": tx(D.redTextSoft),
  "text|[#b91c1c]": tx(D.redText),

  /* family borders */
  "border|amber-200": bd(D.amberBorder),
  "border|[#e0e7ff]": bd(D.indigoBorder),
  "border|red-200": bd(D.redBorder),

  /* gradient stops (scroll fades over cards) */
  "to|white": { "--tw-gradient-to": D.surface },
  "from|white": { "--tw-gradient-from": D.surface },

  /* focus states */
  "bg|white:focus": null, // handled by variant expansion of bg|white
};
delete MAP["bg|white:focus"];

/* Utilities that are correct on dark as-is (accent dots, solid family
   fills, alpha overlays, and theme-neutral values). */
const KEEP = new Set([
  "text|white",
  "text|black",
  "text|transparent",
  "text|current",
  "bg|transparent",
  "bg|black",
  "from|transparent",
  "to|transparent",
  "via|transparent",
  "bg|[#6366f1]",
  "bg|[#10b981]",
  "bg|[#047857]",
  "bg|[#f43f5e]",
  "bg|[#b45309]",
  "bg|[#d97706]",
  "bg|amber-500/5",
  "border|amber-500/30",
  "border|amber-500/40",
  "border|[#b45309]",
  "border|[#8b5cf6]",
  "text|[#f59e0b]",
  "text|[#fbbf24]",
]);

/* ── Variant handling ───────────────────────────────────────────────────── */
const PSEUDO_VARIANTS = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
  placeholder: "::placeholder",
  first: ":first-child",
  last: ":last-child",
};
const MEDIA_VARIANTS = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
};

/* ── Scan ───────────────────────────────────────────────────────────────── */
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\./.test(entry)) yield full;
  }
}

const TOKEN_RE =
  /(?<![\w[\]#/-])((?:[a-z][a-z-]*(?:-\[[^\]]*\])?:)*)((?:bg|text|border|divide|ring|from|via|to|fill|stroke|outline|decoration|accent|caret)(?:-[trblxyse])?)-((?:\[#[0-9a-fA-F]{3,8}\])|(?:white|black|transparent|current|(?:zinc|gray|neutral|stone|slate|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}))((?:\/\d{1,3})?)(?![\w-])/g;

const found = new Map(); // fullToken -> {variants, prop, color}
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(TOKEN_RE)) {
    const [, variants, prop, color, alpha] = m;
    const full = `${variants}${prop}-${color}${alpha}`;
    if (!found.has(full)) {
      found.set(full, {
        variants: variants ? variants.slice(0, -1).split(/:(?![^[]*\])/) : [],
        prop,
        color: color.toLowerCase() + alpha,
      });
    }
  }
}

/* ── Emit ───────────────────────────────────────────────────────────────── */
function escapeClass(cls) {
  return cls.replace(/[^a-zA-Z0-9-]/g, (c) => `\\${c}`);
}

const unmapped = [];
const rules = [];

for (const [full, { variants, prop, color }] of [...found.entries()].sort()) {
  // Normalize side-specific borders (border-t etc.) to the border map.
  const baseProp = prop.replace(/^(border|divide)-[trblxyse]$/, "$1");
  const key = `${baseProp}|${color}`;
  if (KEEP.has(key)) continue;
  const decls = MAP[key];
  if (!decls) {
    unmapped.push(full);
    continue;
  }

  let selector = `.${escapeClass(full)}`;
  const medias = [];
  let prefix = "";
  let suffix = "";
  let ok = true;
  for (const v of variants) {
    if (PSEUDO_VARIANTS[v]) suffix += PSEUDO_VARIANTS[v];
    else if (MEDIA_VARIANTS[v]) medias.push(MEDIA_VARIANTS[v]);
    else if (v === "group-hover") prefix = ".group:hover " + prefix;
    else if (/^has-\[/.test(v)) suffix += `:has(${v.slice(5, -1)})`;
    else ok = false;
  }
  if (!ok) {
    unmapped.push(full + "   (unknown variant)");
    continue;
  }

  if (prop === "divide") {
    suffix += " > :not([hidden]) ~ :not([hidden])";
  }
  if (/^border-[trblxyse]$/.test(prop)) {
    const side = { t: "top", r: "right", b: "bottom", l: "left" }[prop.slice(-1)];
    if (side) {
      const value = Object.values(decls)[0];
      const body = `border-${side}-color: ${value};`;
      pushRule(medias, `.dark ${prefix}${selector}${suffix}`, body);
      continue;
    }
  }

  const body = Object.entries(decls)
    .map(([p, v]) => `${p}: ${v};`)
    .join(" ");
  pushRule(medias, `.dark ${prefix}${selector}${suffix}`, body);
}

function pushRule(medias, selector, body) {
  let rule = `${selector} { ${body} }`;
  for (const media of medias) rule = `@media ${media} { ${rule} }`;
  rules.push(rule);
}

if (unmapped.length > 0) {
  console.error(
    "Unmapped color utilities found — add them to MAP or KEEP in scripts/generate-dark-theme.mjs:\n" +
      unmapped.map((u) => `  ${u}`).join("\n"),
  );
  process.exit(1);
}

const header = `/*
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/generate-dark-theme.mjs
 *
 * Dark-theme overrides for every hardcoded color utility in src/. These
 * rules are intentionally unlayered so they win over Tailwind's layered
 * utilities whenever <html> carries the .dark class (set by next-themes).
 * Light mode is untouched: nothing here matches without .dark.
 */
`;

writeFileSync(OUT, header + rules.join("\n") + "\n");
console.log(`Wrote ${rules.length} dark-theme rules to ${path.relative(process.cwd(), OUT)}`);
