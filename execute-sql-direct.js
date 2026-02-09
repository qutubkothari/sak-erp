const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Load environment from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, 'apps', 'api', '.env') });

async function main() {
  const sqlFile = process.argv[2] || 'delete-items-vendors-boms.sql';
  const sqlPath = path.isAbsolute(sqlFile) ? sqlFile : path.resolve(process.cwd(), sqlFile);

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  // Get DATABASE_URL or build from SUPABASE credentials
  let connectionString = process.env.DATABASE_URL;
  
  // If DATABASE_URL is localhost/dummy, build from Supabase credentials
  if (!connectionString || connectionString.includes('localhost') || connectionString.includes('dummy')) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePassword = process.env.SUPABASE_PASSWORD || process.env.DATABASE_PASSWORD;
    
    if (!supabaseUrl || !supabasePassword) {
      console.error('❌ Need either DATABASE_URL or SUPABASE_URL + SUPABASE_PASSWORD in apps/api/.env');
      console.error('   Example: SUPABASE_PASSWORD=your_db_password');
      process.exit(1);
    }
    
    // Extract project reference from Supabase URL
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!match) {
      console.error('❌ Invalid SUPABASE_URL format');
      process.exit(1);
    }
    const projectRef = match[1];
    
    // Use session pooler (port 5432) for better transaction support
    connectionString = `postgresql://postgres.${projectRef}:${supabasePassword}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;
    console.log(`🔧 Built pooler connection string from SUPABASE_URL`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`📄 Executing SQL file: ${path.basename(sqlPath)}`);
  console.log(`🔗 Connecting to database...`);

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log('');
    console.log('🔄 Executing SQL (this may take a moment)...');
    console.log('');

    // Execute the SQL
    const result = await client.query(sql);
    
    console.log('');
    console.log('✅ SQL executed successfully');
    if (result.rowCount !== undefined && result.rowCount !== null) {
      console.log(`   Rows affected: ${result.rowCount}`);
    }
    
  } catch (err) {
    console.error('');
    console.error('❌ Error executing SQL:');
    console.error('');
    console.error('Message:', err.message || 'Unknown error');
    console.error('Code:', err.code || 'N/A');
    if (err.detail) {
      console.error('Detail:', err.detail);
    }
    if (err.hint) {
      console.error('Hint:', err.hint);
    }
    if (err.position) {
      console.error('Position:', err.position);
    }
    if (err.where) {
      console.error('Where:', err.where);
    }
    if (err.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(err.stack);
    }
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
