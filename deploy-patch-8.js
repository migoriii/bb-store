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

replaceOnce('server.js',
"  const apiKey = String(process.env.RESEND_API_KEY || '').trim();",
"  const gmailUser = String(process.env.GMAIL_USER || process.env.ADMIN_EMAIL || '').trim();\n  const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\\s/g, '');",
'replace Resend credentials with Gmail credentials');

replaceOnce('server.js',
"  const sender = String(process.env.ORDER_NOTIFICATION_FROM || 'Tindahan sa Eskinita <onboarding@resend.dev>').trim();",
"  const sender = String(process.env.ORDER_NOTIFICATION_FROM || (gmailUser ? 'Tindahan sa Eskinita <' + gmailUser + '>' : '')).trim();",
'use the official Gmail address as sender');

replaceOnce('server.js',
"  if (!apiKey) {\n    console.warn('New order saved, but email notification is not configured. Add RESEND_API_KEY in Railway Variables.');\n    return { ok: false, message: 'RESEND_API_KEY is not configured in Railway.' };\n  }",
"  if (!gmailUser || !gmailAppPassword) {\n    console.warn('New order saved, but Gmail email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Railway Variables.');\n    return { ok: false, message: 'Gmail is not configured yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Railway Variables.' };\n  }",
'require Gmail credentials');

replaceOnce('server.js',
"  const idempotencyId = String(order.id || code).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 150);\n  const response = await fetch('https://api.resend.com/emails', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer ' + apiKey,\n      'Content-Type': 'application/json',\n      'Idempotency-Key': 'eskinita-new-order-' + idempotencyId\n    },\n    body: JSON.stringify({ from: sender, to: [recipient], subject, html, text: textBody }),\n    signal: AbortSignal.timeout(10000)\n  });\n  const result = await response.json().catch(() => ({}));\n  if (!response.ok) {\n    const message = result.message || result.name || 'Email provider error';\n    console.error('Order email notification failed:', response.status, message);\n    return { ok: false, status: response.status, message };\n  }\n  console.log('New order email notification accepted by Resend for order ' + code + '.');\n  return { ok: true, id: result.id || null };",
"  const nodemailer = require('nodemailer');\n  const transporter = nodemailer.createTransport({\n    service: 'gmail',\n    auth: { user: gmailUser, pass: gmailAppPassword },\n    connectionTimeout: 10000,\n    greetingTimeout: 10000,\n    socketTimeout: 15000\n  });\n  const info = await transporter.sendMail({\n    from: sender,\n    to: recipient,\n    subject,\n    html,\n    text: textBody\n  });\n  console.log('Order email accepted by Gmail SMTP for order ' + code + '. Message ID: ' + String(info.messageId || 'not provided'));\n  return { ok: true, id: info.messageId || null };",
'replace Resend API call with Gmail SMTP');

replaceOnce('server.js',
"    return res.json({ ok: true, message: 'Resend accepted the test email. Check the admin inbox and Spam folder.' });",
"    return res.json({ ok: true, message: 'Gmail accepted the test email. Check the admin inbox and Spam folder.' });",
'update test-email success message');

const envFile = path.join(root, '.env.example');
if (fs.existsSync(envFile)) {
  let env = fs.readFileSync(envFile, 'utf8');
  if (!env.includes('GMAIL_APP_PASSWORD=')) {
    env += '\n# Gmail SMTP notifications (use a Google App Password, not your normal password)\nGMAIL_USER=tindahansaeskinita@gmail.com\nGMAIL_APP_PASSWORD=\nORDER_NOTIFICATION_EMAIL=tindahansaeskinita@gmail.com\n';
    fs.writeFileSync(envFile, env, 'utf8');
  }
}
new Function(read('server.js'));
new Function(read('public/admin.js'));
console.log('Switched order and test emails from Resend to Gmail SMTP using private Railway credentials.');
