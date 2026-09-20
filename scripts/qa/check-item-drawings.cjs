#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const appRoot = process.argv[2] || process.cwd();
const itemCode = process.argv[3];
if (!itemCode) throw new Error("Usage: check-item-drawings.cjs <app-root> <item-code>");

for (const line of fs.readFileSync(path.join(appRoot, "apps/api/.env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  process.env[match[1]] = value;
}

const { createClient } = require(path.join(appRoot, "node_modules/@supabase/supabase-js"));
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

(async () => {
  const { data: items, error: itemError } = await client
    .from("items")
    .select("id,tenant_id,code,name,drawing_required,is_active")
    .eq("code", itemCode);
  if (itemError) throw itemError;
  if (!items?.length) throw new Error(`Item ${itemCode} was not found`);

  const output = [];
  for (const item of items) {
    const { data: drawings, error: drawingError } = await client
      .from("item_drawings")
      .select("id,file_name,file_type,file_size,version,is_active,created_at")
      .eq("tenant_id", item.tenant_id)
      .eq("item_id", item.id)
      .order("version", { ascending: false });
    if (drawingError) throw drawingError;
    output.push({
      item: {
        code: item.code,
        name: item.name,
        drawing_required: item.drawing_required,
        is_active: item.is_active,
      },
      drawings: (drawings || []).map((drawing) => ({
        file_name: drawing.file_name,
        file_type: drawing.file_type,
        file_size: drawing.file_size,
        version: drawing.version,
        is_active: drawing.is_active,
        created_at: drawing.created_at,
      })),
    });
  }
  console.log(JSON.stringify(output, null, 2));
})().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
