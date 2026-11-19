// GET /api/check?t=CODE -> { status: "ok", name, email } | { status: "used" } | { status: "invalid" }
import { getStore } from "@netlify/blobs";

const CODE_RE = /^[A-Za-z0-9]{12,40}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const t = new URL(req.url).searchParams.get("t") || "";
  if (!CODE_RE.test(t)) return json({ status: "invalid" });

  const store = getStore({ name: "gift-codes", consistency: "strong" });
  const rec = await store.get(t, { type: "json" });
  if (!rec) return json({ status: "invalid" });
  if (rec.used) return json({ status: "used" });
  return json({ status: "ok", name: rec.name || "", email: rec.email || "" });
};

export const config = { path: "/api/check" };
