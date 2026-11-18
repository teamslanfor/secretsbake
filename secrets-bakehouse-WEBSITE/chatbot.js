/* Secrets Bakehouse – scripted chat assistant (no AI service, no dependencies).
   Answers common questions and takes cake / order enquiries, which are emailed to the bakery. */
(function () {
  'use strict';
  const S = window.SITE;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
  .gb-btn{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:10px;padding:8px 18px 8px 8px;border:2px solid #1e2b4a;border-radius:16px;background:#1e2b4a;color:#fff;font:800 .95rem 'Nunito Sans',system-ui,sans-serif;cursor:pointer;box-shadow:4px 4px 0 #f5c451;transition:transform .35s cubic-bezier(.22,.7,.2,1),box-shadow .35s}
  .gb-btn:hover{transform:translate(-2px,-2px) rotate(-1deg);box-shadow:6px 6px 0 #e0475b}
  .gb-btn i{width:40px;height:40px;border-radius:12px;background:#f5c451;color:#1e2b4a;display:grid;place-items:center;font-style:normal;font-size:1.3rem}
  .gb-panel{position:fixed;right:18px;bottom:88px;z-index:71;width:min(370px,calc(100vw - 36px));height:min(540px,calc(100vh - 120px));background:#fff;border-radius:22px;border:2px solid #1e2b4a;box-shadow:8px 8px 0 #f5c451;display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.22,.7,.2,1)}
  .gb-panel.open{transform:none;opacity:1;pointer-events:auto}
  .gb-head{background:#1e2b4a;color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px}
  .gb-head b{display:block;font:italic 800 1.2rem 'Fraunces',Georgia,serif}
  .gb-head small{color:#c3cbe0;font-size:.78rem}
  .gb-head .x{margin-left:auto;background:rgba(255,255,255,.14);border:0;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1rem}
  .gb-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#fff8ee}
  .gb-m{max-width:86%;padding:10px 14px;border-radius:16px;font-size:.94rem;line-height:1.5;white-space:pre-line;animation:gbIn .35s ease both}
  .gb-m a{color:#b8303f;font-weight:800;text-decoration:underline}
  .gb-bot{background:#fff;border:1.5px solid #eadfce;border-bottom-left-radius:4px;color:#2a2f3d}
  .gb-me{align-self:flex-end;background:#1e2b4a;color:#fff;border-bottom-right-radius:4px}
  .gb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#fff8ee}
  .gb-chips button{border:2px solid #1e2b4a;background:#fff;color:#1e2b4a;border-radius:999px;padding:5px 12px;font:700 .82rem 'Nunito Sans',system-ui,sans-serif;cursor:pointer;transition:all .25s}
  .gb-chips button:hover{background:#1e2b4a;color:#f5c451}
  .gb-form{display:flex;gap:8px;padding:12px;border-top:1.5px solid #eadfce;background:#fff}
  .gb-form input{flex:1;min-width:0;border:2px solid #eadfce;border-radius:12px;padding:10px 14px;font:inherit;font-size:.94rem;background:#fff}
  .gb-form input:focus{outline:none;border-color:#1e2b4a}
  .gb-form button{width:44px;height:44px;border-radius:12px;border:0;background:#e0475b;color:#fff;cursor:pointer;display:grid;place-items:center}
  .gb-form svg{width:18px;height:18px}
  .gb-typing{display:inline-flex;gap:4px}.gb-typing span{width:6px;height:6px;border-radius:50%;background:#b9c2da;animation:gbDot 1s infinite}.gb-typing span:nth-child(2){animation-delay:.15s}.gb-typing span:nth-child(3){animation-delay:.3s}
  @keyframes gbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes gbDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
  @media (max-width:640px){.gb-btn span{display:none}.gb-btn{padding:6px;bottom:86px;right:14px}.gb-panel{bottom:150px;right:14px;height:min(500px,calc(100vh - 180px))}}
  @media (prefers-reduced-motion:reduce){.gb-m,.gb-panel{animation:none;transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const send = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
  <button class="gb-btn" aria-expanded="false" aria-controls="gb-panel"><i aria-hidden="true">🥧</i><span>Ask Secrets</span></button>
  <section class="gb-panel" id="gb-panel" role="dialog" aria-label="Chat with Secrets Bakehouse">
    <div class="gb-head"><div><b>Secrets Bakehouse</b><small>Automated assistant · set answers</small></div><button class="x" aria-label="Close chat">✕</button></div>
    <div class="gb-body" aria-live="polite"></div>
    <div class="gb-chips"></div>
    <form class="gb-form"><label class="sr-only" for="gb-in">Type your message</label><input id="gb-in" autocomplete="off" placeholder="Ask about shops, pasties, cakes…" maxlength="400"><button aria-label="Send">${send}</button></form>
  </section>`;
  document.body.appendChild(root);
  const btn = root.querySelector('.gb-btn'), panel = root.querySelector('.gb-panel'), body = root.querySelector('.gb-body'),
    chipBox = root.querySelector('.gb-chips'), form = root.querySelector('.gb-form'), input = root.querySelector('#gb-in');
  let started = false, busy = false, lead = null;
  const add = (html, who = 'bot') => { const m = document.createElement('div'); m.className = 'gb-m gb-' + who; m.innerHTML = html; body.appendChild(m); body.scrollTop = body.scrollHeight; return m; };
  const say = (html, wait = 450) => new Promise((res) => { const t = add('<span class="gb-typing"><span></span><span></span><span></span></span>'); setTimeout(() => { t.innerHTML = html; body.scrollTop = body.scrollHeight; res(); }, wait); });
  const chips = (list) => { chipBox.innerHTML = ''; list.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => handle(c); chipBox.appendChild(b); }); };
  const MAIN = ['Our shops', 'Order a cake', 'Delivery', 'Contact'];
  const contact = () => `📞 Newport <a href="${S.phoneHref}">${S.phone}</a>\n📞 Cwmbran <a href="tel:+441633904333">01633 904333</a>\n✉️ <a href="mailto:${S.email}">${S.email}</a>\n💬 <a href="${S.facebook}" target="_blank" rel="noopener">Message us on Facebook</a>`;
  const go = (href, label) => `<a href="${href}">${label}</a>`;
  const intents = [
    { re: /^(start my cake order|order a cake|i want to order a cake|place a cake order|start my order)$/i, run: startLead },
    { re: /afternoon tea|tea box|gift box/i, run: () => say(`Yes, we make <strong>afternoon tea boxes</strong>, perfect for birthdays, treats and gifts. ${go('cakes.html#tea-form', 'Request afternoon tea boxes')}`).then(() => chips(['Order a cake', 'Our shops'])) },
    { re: /birthday|wedding|anniversar|celebrat|custom cake|bespoke|cake for|occasion|christening|cake/i, run: () => say(`We bake <strong>bespoke cakes</strong> to order for birthdays and celebrations. Would you like to start a cake enquiry?`).then(() => chips(['Start my cake order', 'Afternoon tea boxes'])) },
    { re: /deliver|just ?eat|uber|takeaway|order online|online/i, run: () => say(`You can get Secrets delivered through <a href="${S.justEat}" target="_blank" rel="noopener">Just Eat</a> and <a href="${S.uberEats}" target="_blank" rel="noopener">Uber Eats</a>. For cakes and bigger orders, use our ${go('cakes.html', 'order forms')}.`).then(() => chips(MAIN)) },
    { re: /newport|alexandra/i, run: () => say(`Our <strong>Newport</strong> shop is at 42 Alexandra Road, Newport NP20 2JE. Call <a href="${S.phoneHref}">${S.phone}</a>. ${go('shops.html#newport', 'Map &amp; details')}`).then(() => chips(MAIN)) },
    { re: /cwmbran|pontnewydd|chapel/i, run: () => say(`Our <strong>Cwmbran</strong> shop is at 7 Chapel Street, Pontnewydd, Cwmbran NP44 1DW. Call <a href="tel:+441633904333">01633 904333</a>. ${go('shops.html#cwmbran', 'Map &amp; details')}`).then(() => chips(MAIN)) },
    { re: /cefn|fforest/i, run: () => say(`Our <strong>Cefn Fforest</strong> shop is at 97 Cefn Fforest Avenue, NP12 3JX. ${go('shops.html#cefn-fforest', 'Map &amp; details')}`).then(() => chips(MAIN)) },
    { re: /fleur|lis\b/i, run: () => say(`Our <strong>Fleur-de-lis</strong> shop is at 18 High Street, Fleur-de-lis, NP12 3UB. ${go('shops.html#fleur-de-lis', 'Map &amp; details')}`).then(() => chips(MAIN)) },
    { re: /where|address|location|shops?\b|branch|near me|find you|direction|blackwood|gwent/i, run: () => say(`We have <strong>4 shops across Gwent</strong>:\n• Newport, 42 Alexandra Road\n• Cwmbran, 7 Chapel Street, Pontnewydd\n• Cefn Fforest, 97 Cefn Fforest Avenue\n• Fleur-de-lis, 18 High Street\n${go('shops.html', 'See maps &amp; details')}`).then(() => chips(['Opening hours', 'Delivery'])) },
    { re: /hour|open|close|closing|time|today|sunday|saturday|holiday/i, run: () => say(`Opening hours can differ between our four shops, so please give your local shop a quick call:\n${contact()}`).then(() => chips(MAIN)) },
    { re: /pasty|pasties|pie|sausage|savoury|savory|lunch|hot food/i, run: () => say(`Our <strong>huge traditional pasties</strong> are the star of the counter. In Newport they’ve sold out by 11:30am! We also bake classic pies and savoury treats fresh every day. Get in early. ${go('menu.html', 'See our bakes')}`).then(() => chips(['Our shops', 'Delivery'])) },
    { re: /doughnut|donut|cruffin|cream|pastr|sweet|treat|brownie|tart|croissant|biscoff/i, run: () => say(`From cream-filled doughnuts and cruffins to pastries and sweet treats, the counter changes daily. ${go('menu.html?cat=sweet', 'See our sweet bakes')}`).then(() => chips(MAIN)) },
    { re: /bread|loaf|loaves|roll/i, run: () => say(`We bake fresh loaves of bread every day. Ask in your local shop for today’s selection. ${go('menu.html?cat=bread', 'Our bread')}`).then(() => chips(MAIN)) },
    { re: /allerg|gluten|wheat|vegan|vegetarian|dairy|\bnuts?\b|egg|dietary/i, run: () => say(`Our bakes are made in kitchens that handle wheat, gluten, eggs, milk, nuts, soya and sesame. Please speak to the team in store or call before ordering. They’ll tell you exactly what’s in each bake.`).then(() => chips(MAIN)) },
    { re: /job|work|career|vacanc|hiring|staff/i, run: () => say(`We’re a growing team of 30+ people. To ask about jobs, send us a message via our ${go('contact.html?topic=jobs#enquiry', 'contact form')}.`).then(() => chips(MAIN)) },
    { re: /bulk|large order|party|platter|event|office|cater/i, run: () => say(`For larger or party orders, tell us what you need and the date, and we’ll get back to you. ${go('contact.html?item=Bulk%20order#enquiry', 'Send a bulk order enquiry')}`).then(() => chips(MAIN)) },
    { re: /story|about|owner|history|pontnewydd bakery|cornerstone|formerly|new name/i, run: () => say(`Secrets Bakehouse was formerly known as <strong>Pontnewydd Bakery</strong> and <strong>Cornerstone Bakery</strong>. We now have 4 shops across Gwent and a team of 30+. ${go('about.html', 'Read our story')}`).then(() => chips(MAIN)) },
    { re: /review|rating|hygiene|recommend/i, run: () => say(`Our Newport shop holds a <strong>5 (Very Good) food hygiene rating</strong>, and visitors rate us 4/5 across 100+ reviews. ${go('about.html#reviews', 'See what people say')}`).then(() => chips(MAIN)) },
    { re: /contact|phone|call|number|email|reach|talk|human|person|facebook|message/i, run: () => say(`You can reach us here:\n${contact()}`).then(() => chips(MAIN)) },
    { re: /^(hi|hello|hey|hiya|shwmae|good (morning|afternoon|evening))\b/i, run: () => say('Hello! What can we bake for you today?').then(() => chips(MAIN)) },
    { re: /thank|cheers|diolch|great|lovely/i, run: () => say('You’re welcome. See you at the counter soon! 🥧').then(() => chips(MAIN)) },
  ];
  function startLead() { lead = { step: 'name' }; chips([]); return say('Lovely! Let’s get your cake enquiry started. What’s your <strong>name</strong>?'); }
  async function leadStep(v) {
    v = v.trim();
    if (/^(cancel|stop|exit)$/i.test(v)) { lead = null; await say('No problem, cancelled.'); return chips(MAIN); }
    if (/\?\s*$/.test(v) && lead.step !== 'details') { lead = null; const hit = intents.find((i) => i.re.test(v)); if (hit) return hit.run(); await say(`I don’t have a set answer for that one, but the team can help:\n${contact()}`); return chips(MAIN); }
    if (lead.step === 'name') { if (v.length < 2) return say('Could you tell me your name?'); lead.name = v.slice(0, 80); lead.step = 'contact'; return say(`Thanks, ${esc(lead.name.split(' ')[0])}! What’s the best <strong>phone number or email</strong> to reach you?`); }
    if (lead.step === 'contact') {
      const mail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), phone = v.replace(/\D/g, '').length >= 10;
      if (!mail && !phone) return say('That doesn’t look like a valid phone number or email. Could you check it?');
      lead.contact = v; lead.step = 'shop'; chips(['Newport', 'Cwmbran', 'Cefn Fforest', 'Fleur-de-lis']);
      return say('Which shop would you like to collect from?');
    }
    if (lead.step === 'shop') { lead.shop = v.slice(0, 60); lead.step = 'date'; chips(['This weekend', 'Next week', 'Not sure yet']); return say('When do you need it? (date or “not sure yet”)'); }
    if (lead.step === 'date') { lead.date = v.slice(0, 80); lead.step = 'details'; chips(['Birthday cake', 'Celebration cake', 'Afternoon tea boxes', 'Something else']); return say('And what would you like? Size, flavour, number of people and any message on the cake.'); }
    if (lead.step === 'details') {
      if (v.length < 3) return say('Could you add a few more details?');
      chips([]);
      const payload = { _subject: `New cake enquiry (chat) from ${lead.name}`, _template: 'table', name: lead.name, contact: lead.contact, shop: lead.shop, date_needed: lead.date, order: v.slice(0, 1500), source: 'Website chat assistant' };
      const t = add('<span class="gb-typing"><span></span><span></span><span></span></span>');
      const done = lead; lead = null;
      try {
        const r = await fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) === 'false') throw new Error('fail');
        t.innerHTML = `✅ <strong>Sent!</strong> Thanks ${esc(done.name.split(' ')[0])}, the team has your enquiry and will be in touch soon.`;
      } catch (e) {
        const mail = `mailto:${S.email}?subject=${encodeURIComponent('Cake enquiry')}&body=${encodeURIComponent(`Name: ${done.name}\nContact: ${done.contact}\nShop: ${done.shop}\nDate: ${done.date}\n\n${v}`)}`;
        t.innerHTML = `Sorry, I couldn’t send that automatically. Please <a href="${mail}">email it to us</a> (it’s filled in) or call <a href="${S.phoneHref}">${S.phone}</a>.`;
      }
      return chips(MAIN);
    }
  }
  async function handle(text) {
    if (busy || !text.trim()) return;
    busy = true; add(esc(text), 'me');
    try {
      if (lead) { await leadStep(text); return; }
      const map = { 'Our shops': 'shops', 'Order a cake': 'cake', 'Start my cake order': 'start my cake order', 'Opening hours': 'hours', 'Contact': 'contact', 'Delivery': 'delivery', 'Afternoon tea boxes': 'afternoon tea' };
      const q = map[text] || text;
      const hit = intents.find((i) => i.re.test(q));
      if (hit) { await hit.run(); return; }
      await say(`I don’t have a set answer for that one, but the team can help:\n${contact()}`);
      chips(MAIN);
    } finally { busy = false; }
  }
  const open = async (state) => {
    panel.classList.toggle('open', state); btn.setAttribute('aria-expanded', String(state));
    if (state) {
      input.focus();
      if (!started) { started = true; await say('Hello and welcome to <strong>Secrets Bakehouse</strong>! 🥧 Ask me about our 4 shops, pasties, cakes or delivery.', 300); add(`<small>Automated assistant with set answers. For anything else, call <a href="${S.phoneHref}">${S.phone}</a>.</small>`); chips(MAIN); }
    }
  };
  btn.addEventListener('click', () => open(!panel.classList.contains('open')));
  root.querySelector('.x').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; handle(v); });
})();
