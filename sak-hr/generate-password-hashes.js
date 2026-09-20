const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = ['admin123', 'manager123', 'employee123'];
  
  console.log('Generating bcrypt hashes...\n');
  
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('');
  }
}

generateHashes();
