// Quick migration runner for email_config table
const { Pool } = require('./node_modules/.pnpm/pg@8.16.3/node_modules/pg');
const fs = require('fs');

// Use DIRECT_URL for migrations (not pooled)
const connectionString = 'postgresql://postgres.nwkaruzvzwwuftjquypk:SAK-ERP-2024-db@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const sql = fs.readFileSync('./add-email-config-table.sql', 'utf8');
  
  try {
    await pool.query(sql);
    console.log('✅ Migration successful: email_config table created');
    
    // Verify by selecting data
    const result = await pool.query('SELECT email_type, email_address FROM email_config ORDER BY id');
    console.log('\n📧 Email Configuration:');
    result.rows.forEach(row => {
      console.log(`  - ${row.email_type}: ${row.email_address}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
