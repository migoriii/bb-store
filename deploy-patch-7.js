'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '/srv/tindahan-sa-eskinita');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value, 'utf8');
function replaceOnce(file, from, to, label) {
  const source = read(file);
  const at = source.indexOf(from);
  if (at < 0 || source.indexOf(from, at + from.length) >= 0) {
    throw new Error('Expected exactly one patch anchor for ' + label + ' in ' + file);
  }
  write(file, source.slice(0, at) + to + source.slice(at + from.length));
}

// Return a safe result so the admin-only test button can show real provider errors.
replaceOnce('server.js',
"    console.warn('New order saved, but email notification is not configured. Add RESEND_API_KEY in Railway Variables.');\n    return;",
"    console.warn('New order saved, but email notification is not configured. Add RESEND_API_KEY in Railway Variables.');\n    return { ok: false, message: 'RESEND_API_KEY is not configured in Railway.' };",
'return missing API-key status');
replaceOnce('server.js',
"    console.warn('New order saved, but no notification recipient is configured. Set ORDER_NOTIFICATION_EMAIL or ADMIN_EMAIL.');\n    return;",
"    console.warn('New order saved, but no notification recipient is configured. Set ORDER_NOTIFICATION_EMAIL or ADMIN_EMAIL.');\n    return { ok: false, message: 'No order notification recipient is configured.' };",
'return missing recipient status');
replaceOnce('server.js',
"  const subject = 'New order ' + code + ' — Tindahan sa Eskinita';",
"  const subject = order.isEmailTest ? '[TEST] Tindahan sa Eskinita email notification' : 'New order ' + code + ' — Tindahan sa Eskinita';",
'mark test email subject');
replaceOnce('server.js',
"  const html = '<div style=\"font-family:Arial,sans-serif;color:#26352b;max-width:620px;margin:auto\">' +\n    '<h2 style=\"color:#326343\">New order received!</h2>' +\n    '<p>A customer has placed an order at Tindahan sa Eskinita.</p>' +",
"  const html = '<div style=\"font-family:Arial,sans-serif;color:#26352b;max-width:620px;margin:auto\">' +\n    (order.isEmailTest\n      ? '<h2 style=\"color:#326343\">Email notifications are connected!</h2><p>This is a test message from your store admin. No customer order was created.</p>'\n      : '<h2 style=\"color:#326343\">New order received!</h2><p>A customer has placed an order at Tindahan sa Eskinita.</p>') +",
'add test email content');
replaceOnce('server.js',
"    'A customer has placed an order at Tindahan sa Eskinita.',",
"    order.isEmailTest ? 'This is a test message from your store admin. No customer order was created.' : 'A customer has placed an order at Tindahan sa Eskinita.',",
'add test email text body');
replaceOnce('server.js',
"    console.error('Order email notification failed:', response.status, result.message || result.name || 'Email provider error');\n    return;\n  }\n  console.log('New order email notification accepted by Resend for order ' + code + '.');",
"    const message = result.message || result.name || 'Email provider error';\n    console.error('Order email notification failed:', response.status, message);\n    return { ok: false, status: response.status, message };\n  }\n  console.log('New order email notification accepted by Resend for order ' + code + '.');\n  return { ok: true, id: result.id || null };",
'return Resend provider result');

// Daily compressed snapshots stay on the existing persistent volume; keep only seven.
const backupCode = [
"// Small rolling database safety net. Snapshots share the existing /app/data volume;",
"// the admin can also download a current JSON copy for storage somewhere off-site.",
"const localDbBackupDir = path.join(path.dirname(DB_FILE), 'backups');",
"const localDbBackupIntervalMs = 24 * 60 * 60 * 1000;",
"function createDailyLocalDbBackup() {",
"  try {",
"    if (!fs.existsSync(DB_FILE)) return;",
"    fs.mkdirSync(localDbBackupDir, { recursive: true });",
"    const files = fs.readdirSync(localDbBackupDir)",
"      .filter((name) => name.startsWith('db-backup-') && name.endsWith('.json.gz'))",
"      .map((name) => ({ name, mtimeMs: fs.statSync(path.join(localDbBackupDir, name)).mtimeMs }))",
"      .sort((a, b) => a.mtimeMs - b.mtimeMs);",
"    if (files.length && Date.now() - files[files.length - 1].mtimeMs < localDbBackupIntervalMs) return;",
"    const stamp = new Date().toISOString().replace(/[:.]/g, '-');",
"    const destination = path.join(localDbBackupDir, 'db-backup-' + stamp + '.json.gz');",
"    const zlib = require('node:zlib');",
"    fs.writeFileSync(destination, zlib.gzipSync(fs.readFileSync(DB_FILE)));",
"    const retained = fs.readdirSync(localDbBackupDir)",
"      .filter((name) => name.startsWith('db-backup-') && name.endsWith('.json.gz'))",
"      .map((name) => ({ name, mtimeMs: fs.statSync(path.join(localDbBackupDir, name)).mtimeMs }))",
"      .sort((a, b) => a.mtimeMs - b.mtimeMs);",
"    for (const old of retained.slice(0, Math.max(0, retained.length - 7))) fs.unlinkSync(path.join(localDbBackupDir, old.name));",
"    console.log('Created local database backup; retaining up to seven daily snapshots.');",
"  } catch (error) {",
"    console.warn('Local database backup warning:', error && error.message ? error.message : 'Unknown backup error');",
"  }",
"}",
"createDailyLocalDbBackup();",
"const localDbBackupTimer = setInterval(createDailyLocalDbBackup, 60 * 60 * 1000);",
"if (typeof localDbBackupTimer.unref === 'function') localDbBackupTimer.unref();",
""
].join('\n');
replaceOnce('server.js', 'const originalSaveDbForOrderEmail = saveDb;', backupCode + '\nconst originalSaveDbForOrderEmail = saveDb;', 'daily local database backups');

// Both actions are admin-session protected. The email test never creates or saves an order.
replaceOnce('server.js',
"app.patch('/api/admin/settings', requireAdmin, (req, res) => {",
[
"app.post('/api/admin/test-email', requireAdmin, async (req, res) => {",
"  const testOrder = {",
"    id: 'email-test-' + Date.now(), code: 'EMAIL-TEST', isEmailTest: true,",
"    customerName: 'Store Admin', phone: '', fulfillment: 'Test only',",
"    paymentMethod: 'Test message', status: 'test',",
"    items: [{ name: 'Email delivery check (not a real purchase)', quantity: 1, price: 0 }], total: 0",
"  };",
"  try {",
"    const result = await sendNewOrderEmail(testOrder);",
"    if (!result || !result.ok) return res.status(502).json({ error: result && result.message ? result.message : 'Resend did not accept the test email. Check the Railway logs.' });",
"    return res.json({ ok: true, message: 'Resend accepted the test email. Check the admin inbox and Spam folder.' });",
"  } catch (error) {",
"    console.error('Admin email test failed:', error && error.message ? error.message : 'Unknown email error');",
"    return res.status(502).json({ error: 'The test email could not be sent. Check the Railway deployment logs.' });",
"  }",
"});",
"",
"app.get('/api/admin/database-backup', requireAdmin, (req, res) => {",
"  if (!fs.existsSync(DB_FILE)) return res.status(404).json({ error: 'The store database file was not found.' });",
"  const date = new Date().toISOString().slice(0, 10);",
"  res.setHeader('Cache-Control', 'no-store');",
"  return res.download(DB_FILE, 'tindahan-sa-eskinita-backup-' + date + '.json');",
"});",
"",
"app.patch('/api/admin/settings', requireAdmin, (req, res) => {"
].join('\n'), 'admin-only email test and database export routes');

// Put simple controls beside the existing store settings.
replaceOnce('public/admin.html',
'<label class="field">Store hours<input name="storeHours" maxlength="240" /></label>',
'<label class="field">Store hours<input name="storeHours" maxlength="240" /></label><div class="settings-backup-actions"><button type="button" class="admin-button" id="testOrderEmailButton">Send test email</button><a class="admin-button" href="/api/admin/database-backup">Download database backup</a><p class="muted-note">The store keeps up to seven daily compressed snapshots on its data volume. Download a copy regularly for protection outside Railway.</p><div id="emailTestMessage" class="muted-note" role="status" aria-live="polite"></div></div>',
'add email test and backup controls');
const adminEmailHandler = [
"$('#testOrderEmailButton').addEventListener('click', async () => {",
"  const button = $('#testOrderEmailButton');",
"  const message = $('#emailTestMessage');",
"  button.disabled = true;",
"  button.textContent = 'Sending test...';",
"  message.textContent = '';",
"  try {",
"    const result = await api('/api/admin/test-email', { method: 'POST', body: JSON.stringify({}) });",
"    message.textContent = result.message || 'Resend accepted the test email. Check your inbox.';",
"  } catch (error) {",
"    message.textContent = error.message || 'The test email could not be sent. Check Railway logs.';",
"  } finally {",
"    button.disabled = false;",
"    button.textContent = 'Send test email';",
"  }",
"});"
].join('\n');
const currentAdminJs = read('public/admin.js');
if (!currentAdminJs.includes("$('#testOrderEmailButton').addEventListener('click'")) {
  write('public/admin.js', currentAdminJs + '\n' + adminEmailHandler + '\n');
}
write('public/styles.css', read('public/styles.css') + '\n.settings-backup-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:12px}.settings-backup-actions p,.settings-backup-actions #emailTestMessage{flex-basis:100%;margin:2px 0;font-size:12px}\n');

new Function(read('server.js'));
new Function(read('public/admin.js'));
console.log('Added an admin-only Resend test, a protected database export, and seven rotating daily compressed local database snapshots.');
