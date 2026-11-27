import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const orders = new Map();
const PRICE = '4.99';

function qrLib() {
  try {
    return require('qrcode');
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function mollieKey() {
  const key = String(process.env.MOLLIE_API_KEY || process.env.MOLLIE_API_KEY_TEST || '').trim();
  return key.startsWith('test_') || key.startsWith('live_') ? key : '';
}

function aiKey() {
  const key = String(process.env.CLASS_MODELS_AI_KEY || process.env.OPENAI_API_KEY || '').trim();
  return key.startsWith('sk-') ? key : '';
}

function clean(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function validOrder(body) {
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const phone = clean(body.phone, 24);
  const gender = body.gender === 'women' ? 'women' : body.gender === 'men' ? 'men' : '';
  const height = Number(body.height);
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 3) : [];
  if (name.length < 2) return 'Vul je naam in.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Vul een geldig e-mailadres in.';
  if (phone.replace(/\D/g, '').length < 8) return 'Vul je gsm-nummer in.';
  if (!gender) return 'Kies man of vrouw.';
  if (!Number.isFinite(height) || height < 100 || height > 240) return 'Vul je lengte in, tussen 100 en 240 cm.';
  if (photos.length !== 3 || photos.some((p) => typeof p !== 'string' || !p.startsWith('data:image/') || p.length > 2_400_000)) {
    return 'Voeg drie foto’s toe: lichaam, gezicht en zijaanzicht.';
  }
  return { name, email, phone, gender, height, photos };
}

async function qrDataUrl(text) {
  const QR = qrLib();
  if (!QR) return '';
  return QR.toDataURL(text, { margin: 1, width: 280, color: { dark: '#14120e', light: '#ffffff' } });
}

async function mollieCreate(order, origin) {
  const key = mollieKey();
  if (!key) return null;
  const created = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: PRICE },
      description: `Class-Models modelprofiel — ${order.name}`,
      redirectUrl: `${origin}/modelprofiel/index.html?order=${order.id}`,
      webhookUrl: `${origin}/api/modelprofiel?action=webhook`,
      metadata: { orderId: order.id, email: order.email },
    }),
  });
  const payment = await created.json();
  if (!created.ok) return { error: payment?.detail || payment?.title || 'Mollie weigerde de betaling.' };
  let qr = '';
  const details = await fetch(`https://api.mollie.com/v2/payments/${payment.id}?include=details.qrCode`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const full = await details.json();
  qr = full?.details?.qrCode?.src || '';
  const checkout = payment?._links?.checkout?.href || '';
  if (!qr && checkout) qr = await qrDataUrl(checkout);
  return { id: payment.id, checkout, qr };
}

async function mollieStatus(paymentId) {
  const key = mollieKey();
  if (!key || !paymentId) return '';
  const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const payment = await res.json();
  return payment?.status || '';
}

async function mollieRefund(order) {
  const key = mollieKey();
  if (!key || !order.paymentId || order.refundId) return order;
  const res = await fetch(`https://api.mollie.com/v2/payments/${order.paymentId}/refunds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: PRICE },
      description: 'Terugbetaling modelprofiel na afspraak',
    }),
  });
  const refund = await res.json();
  if (res.ok) order.refundId = refund.id;
  return order;
}

function localReport(order) {
  const who = order.gender === 'women' ? 'vrouw' : 'man';
  return [
    `Dag ${order.name},`,
    '',
    'Je modelprofiel bij Class-Models is opgesteld. Hieronder staat wat we hebben ontvangen en hoe je verder gaat.',
    '',
    'Gegevens',
    `Naam: ${order.name}`,
    `E-mail: ${order.email}`,
    `Gsm: ${order.phone}`,
    `Profiel: ${who}, ${order.height} cm`,
    '',
    'Beelden',
    '1. Volledig lichaam — ontvangen',
    '2. Close-up gezicht — ontvangen',
    '3. Zijaanzicht — ontvangen',
    '',
    'Waar het bureau op let',
    'Een bruikbaar profiel toont je recht van voren, met het hele lichaam in beeld, en een gezicht zonder bedekking. Het zijaanzicht laat je profiel zien: voorhoofd, neus, lippen en kin vrij. Egaal licht en geen filter geven een eerlijker beeld dan een bewerkte foto.',
    '',
    'Volgende stap',
    'Een kennismaking boeken blijft de weg om model te worden. Dat verandert niet. Het bedrag van €4,99 krijg je terug zodra die afspraak geboekt is. Zo blijft de agenda vrij voor mensen die echt willen komen.',
    '',
    'Afspraak: https://www.class-models.be/gasten/model-worden',
    '',
    'Class-Models',
  ].join('\n');
}

async function aiReport(order) {
  const key = aiKey();
  if (!key) return { text: localReport(order), ai: false };
  const who = order.gender === 'women' ? 'vrouw' : 'man';
  const prompt = [
    'Schrijf in het Nederlands een professioneel modelprofiel voor Class-Models.',
    'Gebruik alleen wat op de drie foto’s zichtbaar is: 1 volledig lichaam, 2 close-up gezicht, 3 zijaanzicht.',
    `Gegevens: ${order.name}, ${who}, ${order.height} cm.`,
    'Structuur met deze koppen: Indruk, Lichaam, Gezicht, Zijaanzicht, Aandachtspunten, Volgende stap.',
    'Geen medische uitspraken, geen schoonheidsscore, geen garantie dat iemand wordt aangenomen.',
    'Sluit af met: een kennismaking boeken blijft nodig om model te worden, en €4,99 wordt terugbetaald zodra die afspraak geboekt is.',
    'Vlakke tekst, geen markdown.',
  ].join(' ');
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1100,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...order.photos.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        }],
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!res.ok || !text) return { text: localReport(order), ai: false };
    return { text, ai: true };
  } catch {
    return { text: localReport(order), ai: false };
  }
}

async function finish(order) {
  if (order.report) return order;
  const made = await aiReport(order);
  order.report = made.text;
  order.ai = made.ai;
  order.paid = true;
  order.mailed = true;
  orders.set(order.id, order);
  return order;
}

export async function handleModelprofiel(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  let body = {};
  if (request.method === 'POST') {
    const raw = await request.text();
    try { body = JSON.parse(raw || '{}'); } catch { body = Object.fromEntries(new URLSearchParams(raw)); }
  }

  if (request.method === 'POST' && action === 'start') {
    const checked = validOrder(body);
    if (typeof checked === 'string') return json({ error: checked }, 400);
    const order = { id: randomUUID(), ...checked, paid: false, created: Date.now() };
    const origin = url.origin;
    const mollie = await mollieCreate(order, origin);
    if (mollie?.error) return json({ error: mollie.error }, 502);
    if (mollie) {
      order.paymentId = mollie.id;
      order.checkout = mollie.checkout;
      order.qr = mollie.qr;
      order.test = false;
    } else {
      const confirm = `${origin}/api/modelprofiel?action=bevestig&id=${order.id}`;
      order.checkout = confirm;
      order.qr = await qrDataUrl(confirm);
      order.test = true;
    }
    orders.set(order.id, order);
    return json({
      id: order.id,
      amount: PRICE,
      qr: order.qr,
      checkout: order.checkout,
      test: order.test,
    });
  }

  if (action === 'bevestig') {
    const order = orders.get(url.searchParams.get('id') || body.id || '');
    if (!order) return json({ error: 'Deze betaling is niet meer gevonden.' }, 404);
    if (order.test || !order.paymentId) await finish(order);
    else {
      const status = await mollieStatus(order.paymentId);
      if (status === 'paid') await finish(order);
      else return json({ error: 'De betaling is nog niet afgerond.', status }, 402);
    }
    if (request.headers.get('accept')?.includes('text/html')) {
      return Response.redirect(`${url.origin}/modelprofiel/index.html?order=${order.id}`, 303);
    }
    return json({ ok: true, id: order.id });
  }

  if (request.method === 'GET' && action === 'status') {
    const order = orders.get(url.searchParams.get('id') || '');
    if (!order) return json({ error: 'Niet gevonden.' }, 404);
    if (!order.paid && order.paymentId) {
      const status = await mollieStatus(order.paymentId);
      if (status === 'paid') await finish(order);
      return json({ paid: order.paid, status });
    }
    return json({
      paid: order.paid,
      report: order.paid ? order.report : '',
      email: order.email,
      ai: !!order.ai,
      refunded: !!order.refundId,
    });
  }

  if (action === 'webhook') {
    const id = body.id;
    for (const order of orders.values()) {
      if (order.paymentId === id) {
        const status = await mollieStatus(id);
        if (status === 'paid') await finish(order);
      }
    }
    return new Response('ok');
  }

  if (request.method === 'POST' && action === 'terug') {
    const email = clean(body.email, 120).toLowerCase();
    const order = [...orders.values()].reverse().find((item) => item.email === email && item.paid);
    if (!order) return json({ error: 'Geen betaald profiel gevonden voor dit e-mailadres.' }, 404);
    await mollieRefund(order);
    order.refundRequested = true;
    orders.set(order.id, order);
    return json({ ok: true, refunded: !!order.refundId, test: !!order.test });
  }

  return json({ error: 'Onbekende aanvraag.' }, 404);
}
