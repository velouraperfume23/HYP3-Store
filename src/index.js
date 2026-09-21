export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/track-visit" && request.method === "POST") {
      return trackVisit(request, env);
    }
    if (url.pathname === "/api/track-order" && request.method === "POST") {
      return trackOrder(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function trackVisit(request, env) {
  try {
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
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function trackOrder(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const items = String(body.items || "").slice(0, 2000);
    const itemsJson = JSON.stringify(body.itemsDetail || []).slice(0, 4000);
    const subtotal = Number(body.subtotal) || 0;
    const discount = Number(body.discount) || 0;
    const promoCode = body.promoCode ? String(body.promoCode).slice(0, 50) : null;
    const shipping = Number(body.shipping) || 0;
    const total = Number(body.total) || 0;
    const ts = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO orders (ts, items, items_json, subtotal, discount, promo_code, shipping, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(ts, items, itemsJson, subtotal, discount, promoCode, shipping, total).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
