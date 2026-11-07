'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '/srv/tindahan-sa-eskinita');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, value) { fs.writeFileSync(path.join(root, file), value, 'utf8'); }
function once(file, from, to, label) {
  const source = read(file), at = source.indexOf(from);
  if (at < 0 || source.indexOf(from, at + from.length) >= 0) throw new Error('Patch anchor not unique: ' + file + ' / ' + label);
  write(file, source.slice(0, at) + to + source.slice(at + from.length));
}
{
  const file = 'public/app.js', source = read(file);
  const re = /function renderCategories\(\) \{[\s\S]*?\n\}/;
  if (!re.test(source)) throw new Error('renderCategories function not found');
  const replacement = [
    'function renderCategories() {',
    "  const preferred = ['All', 'Bigas', 'Itlog', 'Frozen Foods', 'Ulam', 'Grocery', 'Drinks'];",
    '  const actual = state.products.filter((p) => p.active && !p.inquiryOnly).map((p) => p.category);',
    '  const categories = [...new Set([...preferred, ...actual])];',
    "  $('#categoryPills').innerHTML = categories.map((category) => '<button class=\"category-pill ' + (state.category === category ? 'active' : '') + '\" type=\"button\" data-category=\"' + esc(category) + '\">' + (category === 'All' ? 'Lahat' : esc(category)) + '</button>').join('');',
    '}'
  ].join('\n');
  write(file, source.replace(re, replacement));
}
once('public/app.js',
"  $('#emptyProducts').classList.toggle('hidden', products.length > 0);",
"  const emptyState = $('#emptyProducts');\n  emptyState.classList.toggle('hidden', products.length > 0);\n  if (state.category === 'Drinks' && !products.length && !search) {\n    emptyState.querySelector('b').textContent = 'Drinks are coming to the tindahan!';\n    emptyState.querySelector('p').textContent = 'Add bottled water, Coca-Cola, Pepsi, Sprite, Royal, Mountain Dew, 7UP, RC Cola, Sting, or other drinks in Admin → Products with their actual prices and stock.';\n  } else {\n    emptyState.querySelector('b').textContent = 'Wala munang makita.';\n    emptyState.querySelector('p').textContent = 'Try another search or category.';\n  }",
'helpful empty Drinks category');
once('public/index.html',
'  <div class="toast" id="toast" role="status" aria-live="polite"></div>\n</body>',
'  <div class="modal-backdrop" id="quantityBackdrop"></div>\n' +
'  <section class="quantity-modal" id="quantityModal" role="dialog" aria-modal="true" aria-labelledby="quantityModalTitle" aria-hidden="true">\n' +
'    <div class="modal-heading"><div><div class="eyebrow">ADD TO YOUR BASKET</div><h2 id="quantityModalTitle">Choose quantity</h2><p id="quantityProductInfo">Select how many you need.</p></div><button class="close-button" id="closeQuantityButton" aria-label="Close quantity picker">×</button></div>\n' +
'    <div class="quantity-picker-row"><button type="button" id="quantityMinus" aria-label="Decrease quantity">−</button><output id="quantityValue" aria-live="polite">1</output><button type="button" id="quantityPlus" aria-label="Increase quantity">+</button></div>\n' +
'    <p class="quantity-availability" id="quantityAvailability"></p><button class="button button-primary button-full" type="button" id="confirmQuantityAdd">Add to cart</button>\n' +
'  </section>\n  <div class="toast" id="toast" role="status" aria-live="polite"></div>\n</body>',
'quantity selector markup');
once('public/app.js', '// Product and category interactions', [
'let quantityPickerProductId = null;',
'let quantityPickerValue = 1;',
'function updateQuantityPicker() {',
'  const product = state.products.find((item) => item.id === quantityPickerProductId);',
'  if (!product) return;',
'  const inCart = Number(state.cart[product.id] || 0);',
'  const max = Math.max(0, Math.min(99 - inCart, Number(product.stock) - inCart));',
"  $('#quantityValue').textContent = quantityPickerValue;",
"  $('#quantityMinus').disabled = quantityPickerValue <= 1;",
"  $('#quantityPlus').disabled = quantityPickerValue >= max;",
"  $('#quantityAvailability').textContent = max + ' ' + product.unit + ' available to add. ' + (inCart ? inCart + ' already in your cart.' : '');",
"  $('#confirmQuantityAdd').disabled = max < 1 || quantityPickerValue > max;",
"  $('#confirmQuantityAdd').textContent = 'Add ' + quantityPickerValue + ' to cart · ' + money(product.price * quantityPickerValue);",
'}',
'function openQuantityPicker(productId) {',
'  const product = state.products.find((item) => item.id === productId);',
"  if (!product || product.inquiryOnly || !product.active || Number(product.stock) < 1) return toast('Sorry, this item is sold out.');",
'  const inCart = Number(state.cart[product.id] || 0);',
"  if (Math.min(99 - inCart, Number(product.stock) - inCart) < 1) return toast('You already have all available stock of ' + product.name + ' in your cart.');",
'  quantityPickerProductId = product.id;',
'  quantityPickerValue = 1;',
"  $('#quantityModalTitle').textContent = product.name;",
"  $('#quantityProductInfo').textContent = money(product.price) + ' / ' + product.unit;",
'  updateQuantityPicker();',
"  openModal('#quantityModal', '#quantityBackdrop');",
'}',
"$('#quantityMinus').addEventListener('click', () => { quantityPickerValue = Math.max(1, quantityPickerValue - 1); updateQuantityPicker(); });",
"$('#quantityPlus').addEventListener('click', () => {",
'  const product = state.products.find((item) => item.id === quantityPickerProductId);',
'  if (!product) return;',
'  const inCart = Number(state.cart[product.id] || 0);',
'  const max = Math.max(0, Math.min(99 - inCart, Number(product.stock) - inCart));',
'  quantityPickerValue = Math.min(max, quantityPickerValue + 1);',
'  updateQuantityPicker();',
'});',
"$('#confirmQuantityAdd').addEventListener('click', () => {",
'  const product = state.products.find((item) => item.id === quantityPickerProductId);',
"  if (!product) return closeModal('#quantityModal', '#quantityBackdrop');",
'  const inCart = Number(state.cart[product.id] || 0);',
'  const max = Math.max(0, Math.min(99 - inCart, Number(product.stock) - inCart));',
"  if (quantityPickerValue < 1 || quantityPickerValue > max) { updateQuantityPicker(); return toast('The available stock changed. Please choose a valid quantity.'); }",
'  state.cart[product.id] = inCart + quantityPickerValue;',
'  saveCart();',
'  const added = quantityPickerValue;',
'  quantityPickerProductId = null;',
"  closeModal('#quantityModal', '#quantityBackdrop');",
"  toast(added + ' ' + product.unit + ' of ' + product.name + ' added to your cart!');",
'});',
"$('#closeQuantityButton').addEventListener('click', () => closeModal('#quantityModal', '#quantityBackdrop'));",
"$('#quantityBackdrop').addEventListener('click', () => closeModal('#quantityModal', '#quantityBackdrop'));",
'',
'// Product and category interactions'
].join('\n'), 'quantity selector behavior');
{
  const file = 'public/app.js';
  let source = read(file);
  const re = /const current = Number\(state\.cart\[product\.id\] \|\| 0\);[\s\S]*?saveCart\(\);[\s\S]*?toast\([\s\S]*?\);\s*/;
  if (!re.test(source)) throw new Error('Product add-to-cart block not found');
  source = source.replace(re, 'openQuantityPicker(product.id);\n');
  write(file, source);
}
once('public/app.js',
"    closeCart(); closeModal('#checkoutModal', '#checkoutBackdrop'); closeModal('#accountModal', '#accountBackdrop');",
"    closeCart(); closeModal('#checkoutModal', '#checkoutBackdrop'); closeModal('#accountModal', '#accountBackdrop'); closeModal('#quantityModal', '#quantityBackdrop');",
'close quantity selector with Escape');
write('public/styles.css', read('public/styles.css') + '\n' +
'/* Product quantity picker */\n' +
'.quantity-modal{position:fixed;z-index:52;top:50%;left:50%;transform:translate(-50%,-46%) scale(.97);width:min(420px,calc(100% - 28px));max-height:90dvh;overflow:auto;padding:27px 30px 25px;border-radius:18px;background:#fffdf8;box-shadow:var(--shadow);opacity:0;visibility:hidden;transition:.25s}\n' +
'.quantity-modal.open{opacity:1;visibility:visible;transform:translate(-50%,-50%) scale(1)}\n' +
'.quantity-picker-row{display:flex;align-items:center;justify-content:center;gap:24px;margin:24px 0 12px}\n' +
'.quantity-picker-row button{width:48px;height:48px;border:1px solid #dce6d9;border-radius:13px;background:#f1f5ed;color:var(--green);font-size:25px;font-weight:800}\n' +
'.quantity-picker-row button:disabled{opacity:.35;cursor:not-allowed}\n' +
'.quantity-picker-row output{min-width:45px;text-align:center;color:var(--green);font-family:var(--serif);font-size:34px;font-weight:700}\n' +
'.quantity-availability{text-align:center;color:#849084;font-size:10px;line-height:1.6;margin:0 0 19px}\n' +
'#confirmQuantityAdd:disabled{opacity:.5;cursor:not-allowed}\n' +
'@media(max-width:760px){.quantity-modal{padding:22px 19px}}\n');
once('server.js',
"app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {",
[
"app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {",
"  const index = db.orders.findIndex((item) => item.id === req.params.id);",
"  if (index < 0) return res.status(404).json({ error: 'Order not found.' });",
"  const [order] = db.orders.splice(index, 1);",
"  let restoredStock = false;",
"  if (!['completed', 'delivered', 'cancelled'].includes(order.status)) {",
"    for (const line of (Array.isArray(order.items) ? order.items : [])) {",
"      const product = db.products.find((item) => item.id === line.productId);",
"      const quantity = Number(line.quantity);",
"      if (product && Number.isInteger(quantity) && quantity > 0) product.stock += quantity;",
"    }",
"    restoredStock = true;",
"  }",
"  saveDb();",
"  res.json({ ok: true, restoredStock });",
"});",
"",
"app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {"
].join('\n'), 'admin delete endpoint');
once('public/admin.js',
"if (!orders.length) { tbody.innerHTML = '<tr><td colspan=\"6\">No orders yet. New customer orders will appear here.</td></tr>'; return; }",
"if (!orders.length) { tbody.innerHTML = '<tr><td colspan=\"7\">No orders yet. New customer orders will appear here.</td></tr>'; return; }",
'orders empty table colspan');
const dollar = String.fromCharCode(36);
once('public/admin.js', '</select></td></tr>',
'</select></td><td><button type="button" class="admin-button danger" data-delete-order="' + dollar + '{esc(order.id)}" aria-label="Permanently delete order ' + dollar + '{esc(order.code)}">Delete</button></td></tr>',
'delete order button');
once('public/admin.js',
"$('#adminOrdersTable').addEventListener('change', async (event) => {",
[
"$('#adminOrdersTable').addEventListener('click', async (event) => {",
"  const button = event.target.closest('[data-delete-order]');",
"  if (!button) return;",
"  const order = adminData && adminData.orders.find((item) => item.id === button.dataset.deleteOrder);",
"  const code = order ? order.code : 'this order';",
"  const confirmed = window.confirm('Sure to delete? No recovery.\\n\\nOrder ' + code + ' will be permanently removed from the admin records. Any reserved stock on an unfulfilled order will be returned.');",
"  if (!confirmed) return;",
"  button.disabled = true;",
"  try {",
"    await api('/api/admin/orders/' + encodeURIComponent(button.dataset.deleteOrder), { method: 'DELETE' });",
"    await loadDashboard();",
"  } catch (error) { alert(error.message); await loadDashboard(); }",
"});",
"",
"$('#adminOrdersTable').addEventListener('change', async (event) => {"
].join('\n'), 'confirmed delete handler');
once('public/admin.html',
'<tbody id="adminOrdersTable"><tr><td colspan="6">Loading...</td></tr></tbody>',
'<tbody id="adminOrdersTable"><tr><td colspan="7">Loading...</td></tr></tbody>',
'orders loading colspan');
once('public/admin.html',
'<th>Payment</th><th>Order status</th></tr>',
'<th>Payment</th><th>Order status</th><th>Actions</th></tr>',
'orders Actions heading');
new Function(read('public/app.js'));
new Function(read('public/admin.js'));
new Function(read('server.js'));
console.log('Added quantity-first product ordering, a permanent Drinks category, and confirmed admin order deletion.');
