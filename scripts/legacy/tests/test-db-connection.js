// Test Supabase Database Connection
// Run with: node test-db-connection.js

const { Client } = require('pg');

const configs = [
  {
    name: 'Direct Connection (IPv6)',
    connectionString: 'postgresql://postgres:Sak3998515253@db.nwkaruzvzwwuftjquypk.supabase.co:5432/postgres'
  },
  {
    name: 'Transaction Pooler (port 6543)',
    connectionString: 'postgresql://postgres.nwkaruzvzwwuftjquypk:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'Session Pooler (port 5432)',
    connectionString: 'postgresql://postgres.nwkaruzvzwwuftjquypk:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  },
  {
    name: 'Simple username on pooler',
    connectionString: 'postgresql://postgres:Sak3998515253@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  }
];

async function testConnection(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`   Connection string: ${config.connectionString.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    await client.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log(`   ✅ SUCCESS!`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Supabase Database Connections...\n');
  console.log('Project: nwkaruzvzwwuftjquypk');
  console.log('Password: Sak3998515253\n');
  console.log('='.repeat(80));

  for (const config of configs) {
    const success = await testConnection(config);
    if (success) {
      console.log(`\n✨ Use this connection string in your .env file!`);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\nIf all tests failed, please:');
  console.log('1. Go to Supabase Dashboard → Settings → Database');
  console.log('2. Check/reset the database password');
  console.log('3. Copy the EXACT connection string shown there');
  console.log('4. Share it with me (you can mask the password)');
}

main().catch(console.error);
