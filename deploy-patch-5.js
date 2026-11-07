'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '/srv/tindahan-sa-eskinita');
const publicDir = path.join(root, 'public');
const rules = [
  [/nasa\s+isang\s+tindahan\s+na\s+ang\s+pang-araw-araw\s+mong\s+kailangan\./gi, 'BIGAS | FROZEN FOODS | ULAM | LPG | AT IBA PA.'],
  [/Shop\s+anytime,\s*anywhere/gi, 'Order your needs anytime, anywhere'],
  [/Small\s+store,\s*big\s+alaga\.\s*Salamat\s+sa\s+pagtangkilik!/gi, 'Sari-saring tindahan. Salamat po sa pagbisita!']
];
function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (/\.(html|js|css)$/i.test(entry.name)) found.push(full);
  }
  return found;
}
const totals = rules.map(() => 0);
for (const file of walk(publicDir)) {
  let source = fs.readFileSync(file, 'utf8');
  let changed = false;
  rules.forEach(([pattern, replacement], index) => {
    source = source.replace(pattern, () => { totals[index]++; changed = true; return replacement; });
  });
  if (changed) fs.writeFileSync(file, source, 'utf8');
}
const labels = ['main headline', 'online-order subheading', 'closing tagline'];
for (let i = 0; i < totals.length; i++) {
  if (totals[i] < 1) throw new Error('Could not find the expected ' + labels[i] + ' in storefront files.');
}
console.log('Updated storefront copy: ' + totals.map((n, i) => labels[i] + ' (' + n + ')').join(', ') + '.');
