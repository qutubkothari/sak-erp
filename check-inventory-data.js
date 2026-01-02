const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kvfttnibmroxbldmuvvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZnR0bmljbXJveGJsZG11dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5ODQ2ODksImV4cCI6MjA0NzU2MDY4OX0.qrKQVg1oPOOVOa4lpG_cGlPVKLCBigJrXqFaB8XyEj8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventoryData() {
    try {
        console.log('🔍 Checking stock_entries table...');
        
        // Check if table exists and count records
        const { data: stockData, error: stockError, count } = await supabase
            .from('stock_entries')
            .select('*', { count: 'exact', head: true });
            
        if (stockError) {
            console.error('❌ Error with stock_entries:', stockError.message);
        } else {
            console.log(`✅ stock_entries table exists with ${count || 0} records`);
        }
        
        console.log('\n🔍 Checking items table...');
        const { data: itemsData, error: itemsError, count: itemsCount } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true });
            
        if (itemsError) {
            console.error('❌ Error with items:', itemsError.message);
        } else {
            console.log(`✅ items table exists with ${itemsCount || 0} records`);
        }
        
        console.log('\n🔍 Checking warehouses table...');
        const { data: warehousesData, error: warehousesError, count: warehousesCount } = await supabase
            .from('warehouses')
            .select('*', { count: 'exact', head: true });
            
        if (warehousesError) {
            console.error('❌ Error with warehouses:', warehousesError.message);
        } else {
            console.log(`✅ warehouses table exists with ${warehousesCount || 0} records`);
        }
        
        // Try to get a sample of actual data if it exists
        if (count > 0) {
            console.log('\n📋 Sample stock_entries data:');
            const { data: sampleData, error: sampleError } = await supabase
                .from('stock_entries')
                .select('*')
                .limit(3);
                
            if (sampleError) {
                console.error('❌ Error getting sample data:', sampleError.message);
            } else {
                console.log(JSON.stringify(sampleData, null, 2));
            }
        }
        
    } catch (error) {
        console.error('❌ General error:', error.message);
    }
}

checkInventoryData();