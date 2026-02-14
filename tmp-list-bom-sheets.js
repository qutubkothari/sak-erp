const xlsx = require('xlsx');
const wb = xlsx.readFile('BOM-LIST.xlsx');
console.log(JSON.stringify(wb.SheetNames, null, 2));
