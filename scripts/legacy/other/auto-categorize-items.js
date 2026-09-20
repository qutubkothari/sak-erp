import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);
const tenantId = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

// Category detection rules based on keywords in name/code/description
const categoryRules = [
  {
    category: 'Batteries',
    keywords: ['battery', 'cell', 'lithium', 'li-ion', 'nimh', 'alkaline', 'coin cell'],
    caseSensitive: false
  },
  {
    category: 'Capacitors',
    keywords: ['capacitor', 'cap', 'ceramic cap', 'electrolytic', 'tantalum'],
    caseSensitive: false
  },
  {
    category: 'Resistors',
    keywords: ['resistor', 'res', 'ohm', 'potentiometer', 'trimmer'],
    caseSensitive: false
  },
  {
    category: 'Wires & Cables',
    keywords: ['wire', 'cable', 'awg', 'conductor', 'flex cable', 'ribbon cable'],
    caseSensitive: false
  },
  {
    category: 'Fasteners',
    keywords: ['screw', 'bolt', 'nut', 'washer', 'rivet', 'fastener', 'standoff'],
    caseSensitive: false
  },
  {
    category: 'PCBs',
    keywords: ['pcb', 'circuit board', 'board'],
    caseSensitive: false
  },
  {
    category: 'LEDs',
    keywords: ['led', 'light emitting'],
    caseSensitive: false
  },
  {
    category: 'Semiconductors',
    keywords: ['transistor', 'mosfet', 'diode', 'ic ', 'chip', 'microcontroller', 'processor'],
    caseSensitive: false
  },
  {
    category: 'Connectors',
    keywords: ['connector', 'header', 'socket', 'plug', 'jack', 'terminal'],
    caseSensitive: false
  },
  {
    category: 'Switches & Buttons',
    keywords: ['switch', 'button', 'toggle', 'pushbutton'],
    caseSensitive: false
  },
  {
    category: 'Sensors',
    keywords: ['sensor', 'accelerometer', 'gyro', 'temperature sensor', 'pressure sensor'],
    caseSensitive: false
  },
  {
    category: 'Displays',
    keywords: ['display', 'lcd', 'oled', 'screen', 'monitor'],
    caseSensitive: false
  },
  {
    category: 'Enclosures & Mechanical',
    keywords: ['enclosure', 'case', 'housing', 'bracket', 'mount', 'spacer'],
    caseSensitive: false
  },
  {
    category: 'Adhesives & Tapes',
    keywords: ['adhesive', 'tape', 'glue', 'epoxy', 'thermal paste'],
    caseSensitive: false
  },
  {
    category: 'Tools & Accessories',
    keywords: ['tool', 'screwdriver', 'plier', 'cutter'],
    caseSensitive: false
  }
];

function detectCategory(code, name, description) {
  const searchText = `${code} ${name} ${description || ''}`.toLowerCase();
  
  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      const searchKeyword = rule.caseSensitive ? keyword : keyword.toLowerCase();
      if (searchText.includes(searchKeyword)) {
        return rule.category;
      }
    }
  }
  
  return 'General Components'; // Default fallback
}

async function categorizeItems() {
  console.log('\n=== AUTO-CATEGORIZING RAW MATERIALS ===\n');
  
  // Fetch all items with NULL product_category
  const { data: items, error } = await supabase
    .from('items')
    .select('id, code, name, description, product_category, category')
    .eq('tenant_id', tenantId)
    .is('product_category', null);

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Found ${items.length} items without product_category\n`);

  // Group items by detected category
  const categorizedItems = {};
  const updates = [];

  items.forEach(item => {
    const detectedCategory = detectCategory(item.code, item.name, item.description);
    
    if (!categorizedItems[detectedCategory]) {
      categorizedItems[detectedCategory] = [];
    }
    categorizedItems[detectedCategory].push(item);
    
    updates.push({
      id: item.id,
      newCategory: detectedCategory
    });
  });

  // Show summary
  console.log('=== CATEGORIZATION SUMMARY ===\n');
  const sortedCategories = Object.keys(categorizedItems).sort();
  
  sortedCategories.forEach(cat => {
    const count = categorizedItems[cat].length;
    console.log(`${cat}: ${count} items`);
  });

  console.log('\n=== SAMPLE ITEMS PER CATEGORY ===\n');
  sortedCategories.forEach(cat => {
    console.log(`\n${cat}:`);
    categorizedItems[cat].slice(0, 3).forEach(item => {
      console.log(`  - ${item.code} | ${item.name}`);
    });
    if (categorizedItems[cat].length > 3) {
      console.log(`  ... and ${categorizedItems[cat].length - 3} more`);
    }
  });

  // Ask for confirmation (in production, you'd want user input here)
  console.log('\n\n=== READY TO UPDATE ===');
  console.log(`Total items to update: ${updates.length}`);
  console.log('\nStarting update in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Perform updates in batches
  console.log('\nUpdating items...');
  let updated = 0;
  let failed = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from('items')
      .update({ product_category: update.newCategory })
      .eq('id', update.id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error(`Failed to update item ${update.id}:`, error.message);
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) {
        console.log(`Progress: ${updated}/${updates.length} items updated...`);
      }
    }
  }

  console.log('\n=== COMPLETED ===');
  console.log(`✅ Successfully updated: ${updated} items`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} items`);
  }

  // Show final category distribution
  console.log('\n=== FINAL CATEGORY DISTRIBUTION ===\n');
  const { data: finalItems } = await supabase
    .from('items')
    .select('product_category')
    .eq('tenant_id', tenantId);

  const categoryCount = {};
  finalItems.forEach(item => {
    const cat = item.product_category || 'NULL';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  Object.keys(categoryCount).sort().forEach(cat => {
    console.log(`  ${cat}: ${categoryCount[cat]} items`);
  });
}

categorizeItems().catch(console.error);
