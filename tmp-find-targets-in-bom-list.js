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

for(const t of targets){
  const hits=[];
  const codeN=norm(t.code);
  const nameN=norm(t.name);
  for(const sn of wb.SheetNames){
    const sh = wb.Sheets[sn];
    const rows = xlsx.utils.sheet_to_json(sh,{header:1,defval:''});
    const maxRows = Math.min(rows.length, 60);
    for(let r=0;r<maxRows;r++){
      const row = rows[r] || [];
      const rowText = norm(row.join(' | '));
      if(!rowText) continue;
      if(rowText.includes(codeN) || rowText.includes(nameN) || nameN.split(' ').filter(w=>w.length>4).every(w=>rowText.includes(w))){
        hits.push({sheet:sn,row:r+1,text:row.slice(0,8)});
        if(hits.length>=8) break;
      }
    }
  }
  console.log('\n=== TARGET', t.code, '===');
  if(!hits.length) console.log('No direct row hits in first 60 rows across sheets');
  else console.log(JSON.stringify(hits,null,2));
}
