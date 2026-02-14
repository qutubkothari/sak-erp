const xlsx = require('xlsx');
const wb = xlsx.readFile('BOM-LIST.xlsx');
const sh = wb.Sheets['CombineSFG'];
const rows = xlsx.utils.sheet_to_json(sh,{header:1,defval:''});
for(let i=0;i<30 && i<rows.length;i++){
  const row = rows[i]||[];
  if(row.some(c=>String(c).trim()!=='')){
    console.log(String(i+1).padStart(3,' '), JSON.stringify(row.slice(0,14)));
  }
}
