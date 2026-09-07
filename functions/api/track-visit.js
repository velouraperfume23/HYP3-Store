// functions/api/track-visit.js
// Cloudflare Pages Function — logs one page visit per call.
// Bound automatically at /api/track-visit once this file is deployed.

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));

    const page = String(body.page || "").slice(0, 200);
    const referrer = String(body.referrer || "").slice(0, 200);
    const ts = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO visits (ts, page, referrer) VALUES (?, ?, ?)"
    ).bind(ts, page, referrer).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Fail silently from the site's point of view — a broken tracker
    // should never block or slow down a real visitor.
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
