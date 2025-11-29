const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1MjM4MzQsImV4cCI6MjA0ODA5OTgzNH0.vqL3tKPHcmXVTJ4MZ8BpCiT87xDdZlHXKEscKwXL6pE'
);

async function addHsnColumn() {
  console.log('Adding hsn_code column to items table...');
  
  // Check if column exists
  const { data: columns, error: checkError } = await supabase
    .from('items')
    .select('*')
    .limit(1);
  
  if (checkError) {
    console.error('Error checking table:', checkError);
    process.exit(1);
  }
  
  console.log('Items table is accessible');
  console.log('Note: Column addition requires direct database access via Supabase Dashboard');
  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log(`
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(8);

ALTER TABLE items
DROP CONSTRAINT IF EXISTS hsn_code_length_check;

ALTER TABLE items
ADD CONSTRAINT hsn_code_length_check 
CHECK (
  hsn_code IS NULL OR 
  (hsn_code ~ '^[0-9]{4}$' OR hsn_code ~ '^[0-9]{6}$' OR hsn_code ~ '^[0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_items_hsn_code ON items(hsn_code) WHERE hsn_code IS NOT NULL;
  `);
}

addHsnColumn();
