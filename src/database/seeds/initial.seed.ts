import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Company } from '../../modules/platform/companies/entities/company.entity.js';
import { License, PlanType } from '../../modules/platform/licenses/entities/license.entity.js';
import { Location } from '../../modules/gym/locations/entities/location.entity.js';
import { User, UserRole } from '../../modules/auth/entities/user.entity.js';
import { Client } from '../../modules/gym/clients/entities/client.entity.js';
import {
  Membership,
  MembershipType,
} from '../../modules/gym/memberships/entities/membership.entity.js';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'gymzone',
  password: process.env.DB_PASSWORD || 'gymzone',
  database: process.env.DB_NAME || 'gymzone',
  entities: [Company, License, Location, User, Client, Membership],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Starting seed...');

  // 1. SuperAdmin
  const userRepo = dataSource.getRepository(User);
  const existingSuperAdmin = await userRepo.findOne({
    where: { email: 'superadmin@gymzone.com' },
  });

  if (!existingSuperAdmin) {
    const superAdmin = userRepo.create({
      email: 'superadmin@gymzone.com',
      password_hash: await bcrypt.hash('Admin1234!', 10),
      role: UserRole.SUPER_ADMIN,
      company_id: null as unknown as string,
      is_active: true,
    });
    await userRepo.save(superAdmin);
    console.log('SuperAdmin created: superadmin@gymzone.com / Admin1234!');
  } else {
    console.log('SuperAdmin already exists, skipping');
  }

  // 2. License
  const licenseRepo = dataSource.getRepository(License);
  const license = licenseRepo.create({
    plan_type: PlanType.PRO,
    max_locations: 5,
    valid_until: new Date('2027-12-31'),
    is_active: true,
  });
  const savedLicense = await licenseRepo.save(license);
  console.log('License created');

  // 3. Company
  const companyRepo = dataSource.getRepository(Company);
  const company = companyRepo.create({
    name: 'Demo Gym',
    tax_id: '900123456-7',
    is_active: true,
    license: savedLicense,
  });
  const savedCompany = await companyRepo.save(company);
  console.log(`Company created: ${savedCompany.name} (id: ${savedCompany.id})`);

  // 4. Location
  const locationRepo = dataSource.getRepository(Location);
  const location = locationRepo.create({
    name: 'Sede Principal',
    address: 'Calle 123 #45-67, Bogota',
    timezone: 'America/Bogota',
    company_id: savedCompany.id,
  });
  const savedLocation = await locationRepo.save(location);
  console.log(
    `Location created: ${savedLocation.name} (id: ${savedLocation.id})`,
  );

  // 5. Admin User
  const adminUser = userRepo.create({
    email: 'admin@demogym.com',
    password_hash: await bcrypt.hash('Admin1234!', 10),
    role: UserRole.ADMIN,
    company_id: savedCompany.id,
    location_ids: [savedLocation.id],
    is_active: true,
  });
  await userRepo.save(adminUser);
  console.log('Admin created: admin@demogym.com / Admin1234!');

  // 6. Company Owner
  const companyOwner = userRepo.create({
    email: 'owner@demogym.com',
    password_hash: await bcrypt.hash('Admin1234!', 10),
    role: UserRole.COMPANY_OWNER,
    company_id: savedCompany.id,
    is_active: true,
  });
  await userRepo.save(companyOwner);
  console.log('Company Owner created: owner@demogym.com / Admin1234!');

  // 7. Client
  const clientRepo = dataSource.getRepository(Client);
  const client = clientRepo.create({
    full_name: 'Juan Perez',
    email: 'juan@example.com',
    phone: '3001234567',
    rfid_code: 'RFID-DEMO-001',
    company_id: savedCompany.id,
    is_active: true,
  });
  const savedClient = await clientRepo.save(client);
  console.log(
    `Client created: ${savedClient.full_name} (RFID: RFID-DEMO-001)`,
  );

  // 8. Membership
  const membershipRepo = dataSource.getRepository(Membership);
  const today = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const membership = membershipRepo.create({
    client_id: savedClient.id,
    company_id: savedCompany.id,
    type: MembershipType.MONTHLY,
    start_date: today,
    end_date: endDate,
    is_active: true,
  });
  await membershipRepo.save(membership);
  console.log('Membership created (active for 1 month)');

  console.log('\nSeed completed successfully!');
  console.log('\nCredentials:');
  console.log('  SuperAdmin: superadmin@gymzone.com / Admin1234!');
  console.log('  Owner:      owner@demogym.com / Admin1234!');
  console.log('  Admin:      admin@demogym.com / Admin1234!');
  console.log('  Client RFID: RFID-DEMO-001');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
