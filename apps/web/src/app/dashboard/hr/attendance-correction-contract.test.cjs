const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");

assert.match(
  source,
  /onClick=\{\(\) => openAttendanceCorrection\(record\)\}/,
  "The Correct action must pass its displayed attendance row to the correction form",
);
assert.match(
  source,
  /const openAttendanceCorrection = \(record: AttendanceRecord\) => \{[\s\S]{0,160}?setSelectedAttendance\(record\)/,
  "Correct must retain the selected attendance row, including its immutable ID",
);
assert.match(
  source,
  /apiClient\.put\([\s\S]*?`\/hr\/attendance\/\$\{selectedAttendance\.id\}`\s*,\s*attendanceForm\s*,?\s*\)/,
  "Correction must PUT the selected row ID in the endpoint path",
);

console.log("Attendance correction request contract passed.");
