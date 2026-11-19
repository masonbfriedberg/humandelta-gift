// Make one personal link per recipient and register the codes on Netlify.
// Run from this folder:
//   node make-links.mjs recipients.csv      -> adds to links.csv
//   node make-links.mjs --test 3            -> 3 test codes (never reach the Google Form)
// recipients.csv: a header row "name,email", then one person per line.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const SITE = "https://humandelta-gift.netlify.app";
const STORE = "gift-codes";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function makeCode(len = 16) {
  let out = "";
  while (out.length < len) {
    for (const b of randomBytes(len * 2)) {
      if (b < ALPHABET.length * 4) out += ALPHABET[b % ALPHABET.length];
      if (out.length === len) break;
    }
  }
  return out;
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((s) => s.trim()));
  }
  return rows;
}
const csvCell = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);

const args = process.argv.slice(2);
let people, test = false;
if (args[0] === "--test") {
  test = true;
  people = Array.from({ length: Number(args[1] || 1) }, (_, i) => ({ name: "Test Person " + (i + 1), email: "" }));
} else {
  const file = args[0] || "recipients.csv";
  if (!existsSync(file)) { console.error("Can't find " + file); process.exit(1); }
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows.shift().map((h) => h.toLowerCase());
  const ni = header.indexOf("name"), ei = header.indexOf("email");
  if (ni < 0) { console.error('The first row needs a "name" column.'); process.exit(1); }
  people = rows.map((r) => ({ name: r[ni] || "", email: ei >= 0 ? r[ei] || "" : "" }));
}

const added = [];
for (const p of people) {
  const code = makeCode();
  const rec = { name: p.name, email: p.email, used: false, createdAt: new Date().toISOString() };
  if (test) rec.test = true;
  execFileSync("netlify", ["blobs:set", STORE, code, JSON.stringify(rec)], { stdio: ["ignore", "ignore", "inherit"] });
  added.push([p.name, p.email, SITE + "/?t=" + code, code]);
  console.log(p.name.padEnd(28) + " " + SITE + "/?t=" + code);
}

const outFile = test ? "test-links.csv" : "links.csv";
const existing = existsSync(outFile) ? readFileSync(outFile, "utf8").trimEnd().split("\n").slice(1) : [];
writeFileSync(outFile, ["name,email,link,code", ...existing, ...added.map((r) => r.map(csvCell).join(","))].join("\n") + "\n");
console.log("\nSaved " + added.length + " link(s) to " + outFile);
