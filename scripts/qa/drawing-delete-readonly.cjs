const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(process.cwd(), process.argv[2] || 'apps/api/.env') });
const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) throw new Error('Missing database connection');
const url = new URL(raw);
['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => url.searchParams.delete(key));
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

(async () => {
  const columns = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'item_drawings'
    ORDER BY ordinal_position
  `);
  const recent = await pool.query(`
    SELECT d.id, d.file_name, d.lifecycle_status, d.is_active, d.item_id,
           i.code AS owner_code, d.updated_at,
           (SELECT count(*)::int FROM public.engineering_drawing_item_links l
            WHERE l.tenant_id = d.tenant_id AND l.drawing_id = d.id) AS link_count
    FROM public.item_drawings d
    LEFT JOIN public.items i ON i.tenant_id = d.tenant_id AND i.id = d.item_id
    WHERE d.updated_at > now() - interval '2 days'
    ORDER BY d.updated_at DESC
    LIMIT 30
  `);
  console.log(JSON.stringify({
    metadataColumnPresent: columns.rows.some((row) => row.column_name === 'metadata'),
    recentDrawings: recent.rows,
  }, null, 2));
})().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
}).finally(() => pool.end());
