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

// Railway Free/Trial/Hobby disables direct SMTP. Use an authenticated HTTPS
// relay hosted as a Google Apps Script web app owned by the shop's Gmail account.
replaceOnce('server.js',
"  const gmailUser = String(process.env.GMAIL_USER || process.env.ADMIN_EMAIL || '').trim();\n  const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\\s/g, '');",
"  const relayUrl = String(process.env.GMAIL_WEBAPP_URL || '').trim();\n  const relayToken = String(process.env.GMAIL_WEBAPP_TOKEN || '').trim();",
'replace Gmail SMTP credentials with Apps Script HTTPS relay');

replaceOnce('server.js',
"  const sender = String(process.env.ORDER_NOTIFICATION_FROM || (gmailUser ? 'Tindahan sa Eskinita <' + gmailUser + '>' : '')).trim();",
"  const sender = String(process.env.ORDER_NOTIFICATION_FROM || 'Tindahan sa Eskinita').trim();",
'configure sender display name for Apps Script');

replaceOnce('server.js',
"  if (!gmailUser || !gmailAppPassword) {\n    console.warn('New order saved, but Gmail email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Railway Variables.');\n    return { ok: false, message: 'Gmail is not configured yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Railway Variables.' };\n  }",
"  if (!relayUrl || !relayToken) {\n    console.warn('New order saved, but the Gmail HTTPS relay is not configured. Set GMAIL_WEBAPP_URL and GMAIL_WEBAPP_TOKEN in Railway Variables.');\n    return { ok: false, message: 'The Gmail HTTPS relay is not configured yet. Add GMAIL_WEBAPP_URL and GMAIL_WEBAPP_TOKEN in Railway Variables.' };\n  }",
'require Apps Script relay credentials');

replaceOnce('server.js',
"  const nodemailer = require('nodemailer');\n  const transporter = nodemailer.createTransport({\n    service: 'gmail',\n    auth: { user: gmailUser, pass: gmailAppPassword },\n    connectionTimeout: 10000,\n    greetingTimeout: 10000,\n    socketTimeout: 15000\n  });\n  const info = await transporter.sendMail({\n    from: sender,\n    to: recipient,\n    subject,\n    html,\n    text: textBody\n  });\n  console.log('Order email accepted by Gmail SMTP for order ' + code + '. Message ID: ' + String(info.messageId || 'not provided'));\n  return { ok: true, id: info.messageId || null };",
"  const response = await fetch(relayUrl, {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({\n      token: relayToken,\n      to: recipient,\n      subject,\n      html,\n      text: textBody,\n      senderName: sender\n    }),\n    redirect: 'follow',\n    signal: AbortSignal.timeout(20000)\n  });\n  const responseText = await response.text();\n  let relayResult = {};\n  try { relayResult = JSON.parse(responseText); } catch (_) {}\n  if (!response.ok || !relayResult.ok) {\n    const message = String(relayResult.error || ('Gmail relay returned HTTP ' + response.status));\n    console.error('Order email notification failed through Gmail HTTPS relay:', response.status, message);\n    return { ok: false, status: response.status, message };\n  }\n  console.log('Order email accepted by Gmail Apps Script relay for order ' + code + '.');\n  return { ok: true, id: relayResult.messageId || null };",
'replace SMTP transport with HTTPS relay');

replaceOnce('server.js',
"    return res.json({ ok: true, message: 'Gmail accepted the test email. Check the admin inbox and Spam folder.' });",
"    return res.json({ ok: true, message: 'Google Apps Script accepted the test email. Check the admin inbox and Spam folder.' });",
'update test email success message');

const envFile = path.join(root, '.env.example');
if (fs.existsSync(envFile)) {
  let env = fs.readFileSync(envFile, 'utf8');
  env = env.replace(/# Gmail SMTP notifications[\s\S]*?(?=\n\n|$)/, '');
  if (!env.includes('GMAIL_WEBAPP_URL=')) {
    env += '\n\n# Google Apps Script HTTPS email relay (deploy the script as a web app)\nGMAIL_WEBAPP_URL=\nGMAIL_WEBAPP_TOKEN=\nORDER_NOTIFICATION_EMAIL=tindahansaeskinita@gmail.com\n';
  }
  fs.writeFileSync(envFile, env, 'utf8');
}
new Function(read('server.js'));
new Function(read('public/admin.js'));
console.log('Switched order and test notifications from blocked SMTP to authenticated Google Apps Script HTTPS relay.');
