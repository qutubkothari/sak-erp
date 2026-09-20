require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRoleEnum() {
  try {
    // Check the actual type of the role column
    const result = await prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_attribute a ON a.atttypid = t.oid
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = 'User'
        AND a.attname = 'role'
      ORDER BY e.enumsortorder;
    `;
    
    console.log('\n=== Role Enum Values ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Also check a sample user
    const user = await prisma.$queryRaw`SELECT id, email, role FROM "User" LIMIT 1`;
    console.log('\n=== Sample User ===');
    console.log(JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoleEnum();
