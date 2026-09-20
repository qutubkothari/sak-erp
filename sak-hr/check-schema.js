const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Get table structure
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
    
    console.log('\n=== User Table Structure ===');
    columns.forEach(c => console.log(`${c.column_name}: ${c.data_type}`));

    // List all databases
    const databases = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false`;
    console.log('\n=== Available Databases ===');
    databases.forEach(d => console.log(d.datname));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
