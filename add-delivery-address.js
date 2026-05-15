require('dotenv').config({ path: 'apps/api/.env' });
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query('ALTER TABLE purchase_requisitions ADD COLUMN delivery_address text;');
    console.log('Added delivery_address to purchase_requisitions successfully.');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column delivery_address already exists.');
    } else {
      console.error(err);
    }
  } finally {
    await client.end();
  }
}
run();
