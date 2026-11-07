'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '/srv/tindahan-sa-eskinita');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, value) { fs.writeFileSync(path.join(root, file), value, 'utf8'); }
function replaceOnce(file, from, to, label) {
  const source = read(file);
  const at = source.indexOf(from);
  if (at < 0 || source.indexOf(from, at + from.length) >= 0) throw new Error('Expected one patch anchor in ' + file + ': ' + label);
  write(file, source.slice(0, at) + to + source.slice(at + from.length));
}
function replaceFirst(file, from, to, label) {
  const source = read(file);
  const at = source.indexOf(from);
  if (at < 0) throw new Error('Expected patch anchor in ' + file + ': ' + label);
  write(file, source.slice(0, at) + to + source.slice(at + from.length));
}
function replaceRegion(file, start, end, replacement, label) {
  const source = read(file);
  const a = source.indexOf(start);
  const b = a < 0 ? -1 : source.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || source.indexOf(start, a + start.length) >= 0) throw new Error('Could not locate patch region in ' + file + ': ' + label);
  write(file, source.slice(0, a) + replacement + source.slice(b));
}

// Server: persist payment details and accept both supported digital payment methods.
replaceOnce('server.js', "app.use(express.json({ limit: '1mb' }));", "app.use(express.json({ limit: '4mb' }));", 'allow QR image settings payload');
replaceOnce('server.js', "let db = loadDb();", "let db = loadDb();\ndb.settings = db.settings && typeof db.settings === 'object' ? db.settings : {};\nObject.assign(db.settings, { maribankNumber: '', maribankName: '', gcashQrImage: '', maribankQrImage: '' }, db.settings);", 'add backward-compatible payment setting defaults');
replaceOnce('server.js', "const paymentMethod = ['gcash', 'cash_pickup', 'cash_delivery'].includes(body.paymentMethod) ? body.paymentMethod : '';", "const paymentMethod = ['gcash', 'maribank', 'cash_pickup', 'cash_delivery'].includes(body.paymentMethod) ? body.paymentMethod : '';", 'accept MariBank');
replaceOnce('server.js', "fulfillment, deliveryArea, deliveryAddress, paymentMethod, paymentStatus: paymentMethod === 'gcash' ? 'awaiting_reference' : 'unpaid',", "fulfillment, deliveryArea, deliveryAddress, paymentMethod, paymentStatus: ['gcash', 'maribank'].includes(paymentMethod) ? 'awaiting_reference' : 'unpaid',", 'mark digital payments awaiting reference');
replaceOnce('server.js', "res.json({ order: publicOrder(order), settings: { gcashNumber: db.settings.gcashNumber, gcashName: db.settings.gcashName } });", "res.json({ order: publicOrder(order), settings: { gcashNumber: db.settings.gcashNumber, gcashName: db.settings.gcashName, gcashQrImage: db.settings.gcashQrImage || '', maribankNumber: db.settings.maribankNumber || '', maribankName: db.settings.maribankName || '', maribankQrImage: db.settings.maribankQrImage || '' } });", 'return both payment instruction sets');
replaceOnce('server.js', "if (order.paymentMethod !== 'gcash') return res.status(400).json({ error: 'This order does not use GCash.' });\n  const reference = clean(req.body.reference, 100);\n  if (reference.length < 4) return res.status(400).json({ error: 'Please enter your GCash reference number.' });", "if (!['gcash', 'maribank'].includes(order.paymentMethod)) return res.status(400).json({ error: 'This order does not use an e-wallet or bank transfer.' });\n  const reference = clean(req.body.reference, 100);\n  if (reference.length < 4) return res.status(400).json({ error: 'Please enter your transaction reference number.' });", 'accept transfer references for GCash and MariBank');
replaceOnce('server.js', "app.patch('/api/admin/settings', requireAdmin, (req, res) => {\n  const allowed = ['announcement', 'dailyUlamNote', 'gcashNumber', 'gcashName', 'storeHours'];\n  for (const key of allowed) {\n    if (Object.prototype.hasOwnProperty.call(req.body, key)) db.settings[key] = clean(req.body[key], 240);\n  }\n  saveDb();\n  res.json({ settings: db.settings });\n});", "app.patch('/api/admin/settings', requireAdmin, (req, res) => {\n  const textFields = ['announcement', 'dailyUlamNote', 'gcashNumber', 'gcashName', 'maribankNumber', 'maribankName', 'storeHours'];\n  for (const key of textFields) {\n    if (Object.prototype.hasOwnProperty.call(req.body, key)) db.settings[key] = clean(req.body[key], 240);\n  }\n  const imageFields = ['gcashQrImage', 'maribankQrImage'];\n  const imagePattern = /^data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;\n  for (const key of imageFields) {\n    if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;\n    const value = String(req.body[key] || '');\n    if (value && (value.length > 1500000 || !imagePattern.test(value))) return res.status(400).json({ error: 'Please upload a PNG, JPG, or WebP QR image smaller than 1 MB.' });\n    db.settings[key] = value;\n  }\n  saveDb();\n  res.json({ settings: db.settings });\n});", 'save payment account details and QR images');

// Fix the account modal registration tab: the old selector did not exist in the HTML.
replaceOnce('public/app.js', "$('#authTitle').textContent = mode === 'register' ? 'Join our little corner.' : 'Your little corner.';", "$('#accountTitle').textContent = mode === 'register' ? 'Create your account.' : 'Your little corner.';", 'fix guest registration modal heading selector');

// Give checkout both e-wallet options plus fulfillment-sensitive cash.
replaceRegion('public/app.js', 'function renderPaymentOptions() {', '\nfunction openCheckout() {', `function renderPaymentOptions() {
  const fulfillment = $('input[name="fulfillment"]:checked')?.value || 'pickup';
  const current = $('input[name="paymentMethod"]:checked')?.value || 'gcash';
  const cashMethod = fulfillment === 'delivery' ? 'cash_delivery' : 'cash_pickup';
  const cashLabel = fulfillment === 'delivery' ? 'Cash on delivery' : 'Cash on pickup';
  const cashDetail = fulfillment === 'delivery' ? 'Pay when your order arrives.' : 'Pay when you collect your order.';
  const selected = current.startsWith('cash_') ? cashMethod : current;
  $('#paymentOptions').innerHTML = ` + "`" + `
    <label class="payment-option"><input type="radio" name="paymentMethod" value="gcash" \${selected === 'gcash' ? 'checked' : ''} /><span class="payment-symbol gcash-symbol">G</span><span><b>GCash</b><small>Scan the QR or transfer after checkout</small></span></label>
    <label class="payment-option"><input type="radio" name="paymentMethod" value="maribank" \${selected === 'maribank' ? 'checked' : ''} /><span class="payment-symbol">M</span><span><b>MariBank / Bank transfer</b><small>Transfer details and QR appear after checkout</small></span></label>
    <label class="payment-option"><input type="radio" name="paymentMethod" value="\${cashMethod}" \${selected === cashMethod ? 'checked' : ''} /><span class="payment-symbol">💵</span><span><b>\${cashLabel}</b><small>\${cashDetail}</small></span></label>` + "`" + `;
}
`, 'add GCash, MariBank, and cash choices');

// Make account creation more obvious and put tracking at the top of the storefront.
replaceFirst('public/index.html', '<a href="#shop">Mamili</a><a href="#ulam">Today\'s Ulam</a><a href="#how-it-works">Paano umorder?</a>', '<a href="#shop">Mamili</a><a href="#ulam">Today\'s Ulam</a><a href="#how-it-works">Paano umorder?</a><a href="/track.html">Track my order</a>', 'add track link to desktop header');
replaceOnce('public/index.html', '<div class="auth-footnote">Ordering as a guest? No sign in is required at checkout.</div>', '<div class="auth-footnote">New here? Choose <b>Create account</b> above to register. Ordering as a guest is also available at checkout.</div>', 'clarify guest account creation');

// Add admin fields for payment information and QR image upload.
replaceOnce('public/admin.html', '<p>Update the announcement, GCash payment details, and today\'s menu note.</p>', '<p>Update the announcement, daily menu, GCash and MariBank transfer details, and payment QR images.</p>', 'describe new payment settings');
replaceOnce('public/admin.html', '<label class="field">GCash number<input name="gcashNumber" maxlength="240" /></label><label class="field">GCash account name<input name="gcashName" maxlength="240" /></label><label class="field">Store hours<input name="storeHours" maxlength="240" /></label>', '<label class="field">GCash number<input name="gcashNumber" maxlength="240" placeholder="09XX XXX XXXX" /></label><label class="field">GCash account name<input name="gcashName" maxlength="240" placeholder="Account holder name" /></label><label class="field">GCash QR code <span class="optional-label">PNG, JPG, or WebP · max 1 MB</span><input name="gcashQrFile" type="file" accept="image/png,image/jpeg,image/webp" /><img id="gcashQrPreview" class="admin-qr-preview hidden" alt="GCash QR preview" /></label><label class="field">MariBank account number / transfer code<input name="maribankNumber" maxlength="240" placeholder="Enter your MariBank details" /></label><label class="field">MariBank account name<input name="maribankName" maxlength="240" placeholder="Account holder name" /></label><label class="field">MariBank QR code <span class="optional-label">PNG, JPG, or WebP · max 1 MB</span><input name="maribankQrFile" type="file" accept="image/png,image/jpeg,image/webp" /><img id="maribankQrPreview" class="admin-qr-preview hidden" alt="MariBank QR preview" /></label><label class="field">Store hours<input name="storeHours" maxlength="240" /></label>', 'add payment QR and account fields');

// Admin settings editor: preview and upload selected QR images as data URLs.
replaceRegion('public/admin.js', 'function fillSettings(settings) {', '\nfunction resetProductForm() {', `function fillSettings(settings) {
  const form = $('#settingsForm');
  for (const key of ['announcement', 'dailyUlamNote', 'gcashNumber', 'gcashName', 'maribankNumber', 'maribankName', 'storeHours']) form.elements[key].value = settings[key] || '';
  for (const [key, imageId] of [['gcashQrImage', 'gcashQrPreview'], ['maribankQrImage', 'maribankQrPreview']]) {
    const image = $('#' + imageId);
    image.src = settings[key] || '';
    image.classList.toggle('hidden', !settings[key]);
  }
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected QR image.'));
    reader.readAsDataURL(file);
  });
}
`, 'support QR previews and file reads');
replaceRegion('public/admin.js', "$('#settingsForm').addEventListener('submit', async (event) => {", '\n\ncheckAdmin();', `$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = Object.fromEntries(['announcement', 'dailyUlamNote', 'gcashNumber', 'gcashName', 'maribankNumber', 'maribankName', 'storeHours'].map((key) => [key, data.get(key)]));
  for (const [field, setting] of [['gcashQrFile', 'gcashQrImage'], ['maribankQrFile', 'maribankQrImage']]) {
    const file = form.elements[field].files && form.elements[field].files[0];
    if (!file) continue;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      $('#settingsMessage').textContent = 'QR images must be PNG, JPG, or WebP and no larger than 1 MB.';
      return;
    }
    payload[setting] = await fileAsDataUrl(file);
  }
  try {
    await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) });
    form.elements.gcashQrFile.value = '';
    form.elements.maribankQrFile.value = '';
    $('#settingsMessage').textContent = 'Saved successfully. Your payment instructions are now shown after checkout.';
    await loadDashboard();
  } catch (error) { $('#settingsMessage').textContent = error.message; }
});
for (const [field, previewId] of [['gcashQrFile', 'gcashQrPreview'], ['maribankQrFile', 'maribankQrPreview']]) {
  $('#settingsForm').elements[field].addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const preview = $('#' + previewId);
    preview.src = await fileAsDataUrl(file);
    preview.classList.remove('hidden');
  });
}
`, 'upload and save payment QR images');

// Payment confirmation: QR image, account details, and transfer reference for each digital method.
replaceRegion('public/payment.js', 'function paymentBlock(order, settings) {', '\nasync function loadOrder() {', `function paymentBlock(order, settings) {
  const isGcash = order.paymentMethod === 'gcash';
  const isMariBank = order.paymentMethod === 'maribank';
  if (!isGcash && !isMariBank) {
    return '<div class="payment-instructions"><h3>Payment on ' + (order.fulfillment === 'pickup' ? 'pickup' : 'delivery') + '</h3><p>' + (order.fulfillment === 'pickup' ? 'Please pay at the counter when you collect your order.' : 'Please prepare your payment when your order arrives.') + ' Your order is safely recorded. You can track its progress below.</p><span class="status-pill">' + esc(paymentLabels[order.paymentStatus] || order.paymentStatus) + '</span></div>';
  }
  const label = isGcash ? 'GCash' : 'MariBank / Bank transfer';
  const number = isGcash ? settings.gcashNumber : settings.maribankNumber;
  const name = isGcash ? settings.gcashName : settings.maribankName;
  const qr = isGcash ? settings.gcashQrImage : settings.maribankQrImage;
  if (order.paymentStatus === 'paid') return '<div class="payment-instructions"><h3>Payment confirmed. Salamat!</h3><p>Your ' + label + ' payment has been marked as paid by the store.</p><span class="status-pill">PAID</span></div>';
  if (order.paymentStatus === 'for_verification') return '<div class="payment-instructions"><h3>' + label + ' reference received.</h3><p>Thank you! The store will verify your transfer. Your submitted reference is <b>' + esc(order.paymentReference) + '</b>.</p><span class="status-pill">For verification</span></div>';
  const qrBlock = qr ? '<div class="payment-qr-wrap"><img class="payment-qr" src="' + esc(qr) + '" alt="' + label + ' payment QR code" /><small>Scan this QR using your ' + label + ' app.</small></div>' : '<p class="muted-note">Payment QR not yet uploaded by the store. Use the account details below or contact the store before transferring.</p>';
  const accountBlock = '<p><b>Account number / transfer code:</b> ' + esc(number || 'Not yet provided') + '<br /><b>Account name:</b> ' + esc(name || 'Not yet provided') + '</p>';
  return '<div class="payment-instructions"><h3>Pay with ' + label + '</h3><p>Transfer <b>' + money(order.total) + '</b> to the store using the QR code or account details below. The store will verify your payment manually.</p>' + qrBlock + accountBlock + '<p>Include your order code <b>' + esc(order.code) + '</b> in the transfer note when possible. After sending payment, enter your transaction reference number below.</p><form class="reference-form" id="referenceForm"><label class="field">' + label + ' transaction reference<input name="reference" required minlength="4" maxlength="100" placeholder="Enter transaction / reference number" /></label><button class="button button-primary" type="submit" id="referenceButton">Submit reference →</button></form><div class="form-error" id="referenceError"></div></div>';
}
`, 'show QR code and details for both payment methods');

// FAQ-only, rules-based chat. No live-agent claim and no external AI service.
const faqScript = String.raw`'use strict';
(() => {
  if (document.getElementById('faqChatRoot')) return;
  const root = document.createElement('div');
  root.id = 'faqChatRoot';
  root.innerHTML = '<button type="button" class="faq-chat-fab" id="faqChatToggle" aria-expanded="false" aria-controls="faqChatPanel"><span>✳</span> FAQs</button><section class="faq-chat-panel" id="faqChatPanel" aria-label="Store FAQ assistant" hidden><header class="faq-chat-head"><div><b>Ask the Eskinita FAQ</b><small>Automated answers · no live agent</small></div><button type="button" id="faqChatClose" aria-label="Close FAQ">×</button></header><div class="faq-chat-messages" id="faqChatMessages" aria-live="polite"><div class="faq-chat-bubble bot">Hi! I can help with today’s menu, product availability, delivery, payments, accounts, and order tracking. What would you like to know?</div></div><div class="faq-chat-suggestions"><button type="button" data-faq="What ulam is available today?">Today’s ulam</button><button type="button" data-faq="Where do you deliver?">Delivery area</button><button type="button" data-faq="How do I track my order?">Track my order</button></div><form class="faq-chat-form" id="faqChatForm"><input id="faqChatInput" autocomplete="off" maxlength="300" placeholder="Type your question..." aria-label="Ask a store question" required /><button type="submit" aria-label="Send question">➤</button></form></section>';
  document.body.appendChild(root);
  const toggle = document.getElementById('faqChatToggle');
  const panel = document.getElementById('faqChatPanel');
  const messages = document.getElementById('faqChatMessages');
  const input = document.getElementById('faqChatInput');
  let storeData = null;
  async function loadStore() {
    try {
      const response = await fetch('/api/store', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Store information unavailable');
      storeData = await response.json();
      return storeData;
    } catch { return storeData; }
  }
  function addMessage(text, type) {
    const bubble = document.createElement('div');
    bubble.className = 'faq-chat-bubble ' + type;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }
  function peso(value) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)); }
  function answer(question) {
    const q = question.toLowerCase().replace(/[’']/g, '').trim();
    if (!q || q.length < 4) return 'Could you be a little more specific? You can mention a product name or ask about the menu, delivery, payment, account, or order tracking.';
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(q)) return 'Hello! Ask me about today’s ulam, product availability, delivery, payments, creating an account, or tracking an order.';
    if (/track|tracking|order status|where.*order|my order/.test(q)) return 'After checkout, keep your order code and 8-character tracking PIN. Open Track my order at the top of the store, enter both details, and you can refresh the page without losing your tracking details on the same browser. Visit /track.html.';
    if (/create account|register|sign up|signup|sign in|log in|login|account/.test(q)) return 'Tap Sign in in the store header, then choose Create account. Enter your name, email, and a password with at least 8 characters. You can still order as a guest without creating an account.';
    if (/delivery|deliver|shipping|service area|where.*deliver/.test(q)) {
      const area = storeData?.settings?.deliveryArea || 'San Benito, Dinalupihan, Bataan';
      const fee = Number(storeData?.settings?.deliveryFee || 0);
      return 'Local delivery is currently for ' + area + '. ' + (fee === 0 ? 'Delivery is currently free.' : 'The current delivery fee is ' + peso(fee) + '.') + ' Choose Local delivery at checkout and enter your complete address.';
    }
    if (/payment|gcash|mari ?bank|bank transfer|qr|pay/.test(q)) return 'At checkout, choose GCash, MariBank / Bank transfer, or cash on pickup / delivery. After placing the order, the confirmation page shows the store’s QR code and transfer details once the store has added them. Submit your transaction reference so the store can verify it.';
    if (/hour|open|close|business time/.test(q)) return storeData?.settings?.storeHours ? 'Store hours: ' + storeData.settings.storeHours : 'The store has not posted its opening hours yet. Please check with the store before visiting.';
    if (/ulam|menu|available today|available now|today.*food|food.*today/.test(q)) {
      const meals = (storeData?.products || []).filter(p => p.active && p.isDailyUlam && p.availableToday && Number(p.stock) > 0);
      if (!meals.length) return 'There are no daily ulam items marked available right now. Please check back later for the updated menu.';
      return 'Today’s ulam marked available: ' + meals.map(p => p.name + ' (' + peso(p.price) + ')').join(', ') + '. Availability can change as orders come in.';
    }
    const products = storeData?.products || [];
    const match = products.find(p => p.active && (q.includes(String(p.name).toLowerCase()) || String(p.name).toLowerCase().includes(q)));
    if (match) {
      if (match.inquiryOnly) return match.name + ' is inquiry-only. Please contact or visit the store for its current availability and price.';
      if (!match.availableToday || Number(match.stock) < 1) return match.name + ' is not currently marked available. Please check again later.';
      return 'Yes! ' + match.name + ' is marked available today at ' + peso(match.price) + ' ' + (match.unit || '') + '. Current listed stock: ' + match.stock + '. Availability may change as orders are placed.';
    }
    if (/how.*order|how.*buy|how.*checkout|place.*order|order.*work/.test(q)) return 'Browse the products, tap + to add items to your cart, open your cart, then choose pickup or local delivery and your payment method. Place your order and keep the order code and tracking PIN.';
    if (/human|live chat|agent|staff|talk to|contact/.test(q)) return 'This is an automated FAQ helper, not a live chat, so nobody is replying in real time here. For something that needs staff assistance, please contact or visit the store.';
    if (/available|stock|have.*(rice|egg|siomai|tocino|longganisa|adobo|sinigang)/.test(q)) return 'Which exact product are you asking about? Please send its name (for example, Sinandomeng Rice or Chicken Adobo) so I can check the listed availability.';
    return 'I’m not sure I understood that question. Please rephrase it or be more specific—for example, include the product name or ask about today’s menu, delivery, payment, creating an account, or tracking an order.';
  }
  async function ask(question) {
    addMessage(question, 'user');
    input.value = '';
    await loadStore();
    addMessage(answer(question), 'bot');
  }
  toggle.addEventListener('click', async () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.innerHTML = open ? '<span>×</span> Close' : '<span>✳</span> FAQs';
    if (open) { await loadStore(); input.focus(); }
  });
  document.getElementById('faqChatClose').addEventListener('click', () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.innerHTML = '<span>✳</span> FAQs'; });
  document.getElementById('faqChatForm').addEventListener('submit', event => { event.preventDefault(); const q = input.value.trim(); if (q) ask(q); });
  root.querySelectorAll('[data-faq]').forEach(button => button.addEventListener('click', () => ask(button.dataset.faq)));
  loadStore();
})();
`;
for (const file of ['public/index.html', 'public/account.html', 'public/payment.html', 'public/track.html']) {
  let content = read(file);
  if (!content.includes('faq-chat.js')) content = content.replace('</head>', '<script src="/faq-chat.js" defer></script></head>');
  if (content === read(file) && !content.includes('</head>')) throw new Error('Could not inject FAQ script in ' + file);
  write(file, content);
}
write('public/faq-chat.js', faqScript);

write('public/styles.css', read('public/styles.css') + `
/* Payment QR display */
.payment-qr-wrap{display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin:12px 0}.payment-qr{display:block;width:min(250px,100%);height:auto;max-height:300px;object-fit:contain;border:1px solid #dce5d9;border-radius:12px;background:#fff;padding:8px}.payment-qr-wrap small{font-size:9px;color:#728071}.admin-qr-preview{display:block;max-width:180px;max-height:180px;object-fit:contain;padding:7px;margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:10px}.admin-qr-preview.hidden{display:none}
/* Floating automated FAQ helper */
#faqChatRoot{position:fixed;right:20px;bottom:20px;z-index:90;font-family:var(--sans)}.faq-chat-fab{display:flex;align-items:center;gap:8px;border:0;border-radius:999px;background:var(--green);color:white;padding:12px 17px;font-size:11px;font-weight:800;box-shadow:0 8px 24px #163b2b35}.faq-chat-fab span{font-size:16px}.faq-chat-panel{position:absolute;right:0;bottom:58px;width:min(360px,calc(100vw - 28px));height:min(480px,calc(100dvh - 110px));background:#fffdf8;border:1px solid #e1e8de;border-radius:17px;box-shadow:0 18px 55px #1b3d2c30;display:flex;flex-direction:column;overflow:hidden}.faq-chat-panel[hidden]{display:none}.faq-chat-head{display:flex;justify-content:space-between;align-items:center;padding:15px 16px;background:var(--green);color:#fff}.faq-chat-head div{display:flex;flex-direction:column;gap:4px}.faq-chat-head b{font-size:12px}.faq-chat-head small{font-size:9px;color:#d9e6d9}.faq-chat-head button{border:0;background:transparent;color:white;font-size:24px}.faq-chat-messages{display:flex;flex-direction:column;gap:9px;overflow:auto;padding:13px;flex:1}.faq-chat-bubble{max-width:90%;padding:10px 12px;border-radius:12px;font-size:10px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.faq-chat-bubble.bot{background:#edf3e9;color:#334d39;align-self:flex-start;border-bottom-left-radius:4px}.faq-chat-bubble.user{background:#1d4936;color:white;align-self:flex-end;border-bottom-right-radius:4px}.faq-chat-suggestions{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px}.faq-chat-suggestions button{border:1px solid #dce5d9;border-radius:999px;background:white;color:#47644b;padding:6px 9px;font-size:8px;font-weight:700}.faq-chat-form{display:flex;gap:7px;padding:10px;border-top:1px solid #e7ece4;background:white}.faq-chat-form input{min-width:0;flex:1;border:1px solid #dfe6dd;border-radius:9px;padding:10px;font-size:10px;outline:none}.faq-chat-form button{width:38px;border:0;border-radius:9px;background:var(--green);color:#fff;font-weight:900}@media(max-width:760px){#faqChatRoot{right:13px;bottom:13px}.faq-chat-panel{bottom:55px}}
`);
console.log('Applied payment QR, MariBank, registration, header tracking, and FAQ assistant updates.');
