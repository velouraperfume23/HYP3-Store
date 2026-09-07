// functions/api/track-order.js
// Cloudflare Pages Function — logs one order per call, right before the
// customer is sent to WhatsApp to confirm it.

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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
