const xlsx = require('xlsx');
const wb = xlsx.readFile('BOM-LIST.xlsx');
const terms = ['hardowood','lcd holder bracket','pillar spacer','battery holding bracket','craftbatteryhold','fab-3dp-qx7-lcd-hold','fab-3dp-x16-ext-piller'];
function norm(s){return String(s||'').toLowerCase();}
for(const term of terms){
  const hits=[];
  for(const sn of wb.SheetNames){
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''});
    for(let r=0;r<rows.length;r++){
      const row=rows[r]||[];
      const txt=norm(row.join(' | '));
      if(txt.includes(term)) { hits.push({sheet:sn,row:r+1,text:row.slice(0,10)}); if(hits.length>=20) break; }
    }
    if(hits.length>=20) break;
  }
  console.log('\nTERM:',term,'HITS:',hits.length);
  if(hits.length) console.log(JSON.stringify(hits,null,2));
}
