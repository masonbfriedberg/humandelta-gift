// POST /api/submit  { t, name, email, addr1, addr2, city, state, zip }
// Checks the code, marks it used (atomically), then forwards the answers to the Google Form.
import { getStore } from "@netlify/blobs";

const CODE_RE = /^[A-Za-z0-9]{12,40}$/;

const ENDPOINT =
  "https://docs.google.com/forms/d/e/1FAIpQLSdcKZCkgkaMOMhWE5rPdQa6ZT1b8teEDycQY44XBYvN5lJ9gQ/formResponse";
const MAP = {
  name: "entry.617976016",
  email: "entry.391532438",
  addr1: "entry.1964528145",
  addr2: "entry.188754655",
  city: "entry.1880191077",
  state: "entry.118022555",
  zip: "entry.1213127470",
  country: "entry.202182844",
};
const REQUIRED = ["name", "email", "addr1", "city", "state", "zip"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ status: "error" }, 405);

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ status: "error" }, 400);
  }

  const t = String(input.t || "");
  if (!CODE_RE.test(t)) return json({ status: "invalid" }, 404);

  const fields = {};
  for (const k of Object.keys(MAP)) fields[k] = String(input[k] || "").trim().slice(0, 300);
  // Country is no longer asked on the page, but the Google Form requires it.
  fields.country = "United States";
  if (REQUIRED.some((k) => !fields[k]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return json({ status: "error", message: "missing" }, 400);
  }

  const store = getStore({ name: "gift-codes", consistency: "strong" });
  const found = await store.getWithMetadata(t, { type: "json" });
  if (!found || !found.data) return json({ status: "invalid" }, 404);
  const rec = found.data;
  if (rec.used) return json({ status: "used" }, 409);

  // Claim the code only if nobody else changed it since we read it.
  const claimed = { ...rec, used: true, usedAt: new Date().toISOString() };
  const write = await store.setJSON(t, claimed, { onlyIfMatch: found.etag });
  if (!write.modified) return json({ status: "used" }, 409);

  // Test codes never reach the Google Form.
  if (rec.test) return json({ status: "ok", test: true });

  try {
    const body = new URLSearchParams();
    for (const [k, entry] of Object.entries(MAP)) body.append(entry, fields[k]);
    const res = await fetch(ENDPOINT, { method: "POST", body });
    if (!res.ok) throw new Error("Google Form returned " + res.status);
  } catch (err) {
    console.error("forward failed", t, err);
    // Give the code back so the person can try again.
    await store.setJSON(t, rec);
    return json({ status: "error", message: "forward" }, 502);
  }

  return json({ status: "ok" });
};

export const config = { path: "/api/submit" };
