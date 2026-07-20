// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: { name: 'super_admin', description: 'Platform Super Admin' },
  });
  
  const schoolAdminRole = await prisma.role.upsert({
    where: { name: 'school_admin' },
    update: {},
    create: { name: 'school_admin', description: 'School Administrator' },
  });

  // 2. Create Default School
  const school = await prisma.school.upsert({
    where: { kms_code: 'SCH-DEMO' },
    update: {},
    create: { name: 'Demo Academy', kms_code: 'SCH-DEMO', curriculum_type: 'CBC' },
  });

  // 3. Create Super Admin User
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  // ✅ FIX: Use the composite unique key (email_school_id) instead of just email
  await prisma.user.upsert({
    where: { 
      email_school_id: {
        email: 'admin@smis.local',
        school_id: school.id
      } 
    },
    update: {
      password_hash: hashedPassword,
      is_active: true,
    },
    create: {
      email: 'admin@smis.local',
      password_hash: hashedPassword,
      role_id: superAdminRole.id,
      school_id: school.id,
      is_active: true,
    },
  });

  console.log('✅ Seeding complete!');
  console.log('👤 Super Admin Email: admin@smis.local');
  console.log('🔑 Super Admin Password: Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });