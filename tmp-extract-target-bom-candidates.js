const xlsx = require('xlsx');
const wb = xlsx.readFile('BOM-LIST.xlsx');
const targets = [
  { code:'HARDOWOODPACKING', name:'Hardowood packing box' },
  { code:'FAB-3DP-QX7-LCD-HOLD', name:'Remote - LCD Holder Bracket 3D Print' },
  { code:'JETUNITSIGNALCAB', name:'Jet unit Signal Cable Dest. Assy (CMD)' },
  { code:'FAB-3DP-X16-EXT-PILLER', name:'Charger - Panel Pillar Spacer 3D Print' },
  { code:'CRAFTBATTERYHOLD', name:'Craft Battery Holding Bracket 3D Print' },
];
function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}

const out = {};
for (const t of targets) out[t.code] = { target: t, dedicatedSheets: [], fromDedicated: [], fromCombine: [] };

for (const sheetName of wb.SheetNames) {
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  if (!rows.length) continue;

  // Dedicated sheet detection: header row typically has target name in col 8
  const row1 = rows[0] || [];
  const row1Joined = norm(row1.join(' | '));
  for (const t of targets) {
    if (row1Joined.includes(norm(t.name)) || norm(sheetName).includes(norm(t.name).split(' ').slice(0,3).join(' '))) {
      // Parse like import script: row2 header + data rows
      const header = rows[0] || [];
      const idxRawName = header.findIndex(h => norm(h) === norm('RAW MATERIAL NAME'));
      const idxPart = header.findIndex(h => norm(h) === norm('SAS Part Number'));
      const qtyCol = header.findIndex(h => norm(h) === norm(t.name));

      if (idxRawName >= 0) {
        out[t.code].dedicatedSheets.push(sheetName);
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r] || [];
          const rawName = String(row[idxRawName] || '').trim();
          if (!rawName) continue;
          const part = idxPart >= 0 ? String(row[idxPart] || '').trim() : '';
          const qty = qtyCol >= 0 ? Number(row[qtyCol] || 0) : 0;
          if (!rawName) continue;
          out[t.code].fromDedicated.push({ sheet: sheetName, rawName, part, qty: Number.isFinite(qty) ? qty : 0 });
        }
      }
    }
  }

  // CombineSFG parent mapping: [1]=parent, [4]=raw name, [5]=raw part, [7]=combine parent
  if (sheetName === 'CombineSFG') {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const parentA = String(row[1] || '').trim();
      const rawName = String(row[4] || '').trim();
      const rawPart = String(row[5] || '').trim();
      const parentB = String(row[7] || '').trim();

      for (const t of targets) {
        if (norm(parentA) === norm(t.name) || norm(parentB) === norm(t.name)) {
          if (rawName) {
            out[t.code].fromCombine.push({ sheet: sheetName, row: r + 1, parent: norm(parentA) === norm(t.name) ? parentA : parentB, rawName, part: rawPart || '' });
          }
        }
      }
    }
  }
}

console.log(JSON.stringify(out, null, 2));
