import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Company } from '../../modules/platform/companies/entities/company.entity';
import {
  License,
  PlanType,
} from '../../modules/platform/licenses/entities/license.entity';
import { Location } from '../../modules/gym/locations/entities/location.entity';
import { User, UserRole } from '../../modules/auth/entities/user.entity';
import { Client } from '../../modules/gym/clients/entities/client.entity';
import {
  Membership,
  MembershipType,
} from '../../modules/gym/memberships/entities/membership.entity';

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
  let savedLicense = await licenseRepo.findOne({
    where: { plan_type: PlanType.PRO },
  });
  if (!savedLicense) {
    savedLicense = await licenseRepo.save(
      licenseRepo.create({
        plan_type: PlanType.PRO,
        max_locations: 5,
        valid_until: new Date('2027-12-31'),
        is_active: true,
      }),
    );
    console.log('License created');
  } else {
    console.log('License already exists, skipping');
  }

  // 3. Company
  const companyRepo = dataSource.getRepository(Company);
  let savedCompany = await companyRepo.findOne({
    where: { tax_id: '900123456-7' },
  });
  if (!savedCompany) {
    savedCompany = await companyRepo.save(
      companyRepo.create({
        name: 'Demo Gym',
        tax_id: '900123456-7',
        is_active: true,
        license: savedLicense,
      }),
    );
    console.log(
      `Company created: ${savedCompany.name} (id: ${savedCompany.id})`,
    );
  } else {
    console.log(
      `Company already exists: ${savedCompany.name} (id: ${savedCompany.id}), skipping`,
    );
  }

  // 4. Location
  const locationRepo = dataSource.getRepository(Location);
  let savedLocation = await locationRepo.findOne({
    where: { name: 'Sede Principal', company_id: savedCompany.id },
  });
  if (!savedLocation) {
    savedLocation = await locationRepo.save(
      locationRepo.create({
        name: 'Sede Principal',
        address: 'Calle 123 #45-67, Bogota',
        company_id: savedCompany.id,
      }),
    );
    console.log(
      `Location created: ${savedLocation.name} (id: ${savedLocation.id})`,
    );
  } else {
    console.log(
      `Location already exists: ${savedLocation.name} (id: ${savedLocation.id}), skipping`,
    );
  }

  // 5. Admin User
  const existingAdmin = await userRepo.findOne({
    where: { email: 'admin@demogym.com' },
  });
  if (!existingAdmin) {
    const adminUser = userRepo.create({
      email: 'admin@demogym.com',
      password_hash: await bcrypt.hash('Admin1234!', 10),
      role: UserRole.ADMIN,
      company_id: savedCompany.id,
      locations: [savedLocation],
      is_active: true,
    });
    await userRepo.save(adminUser);
    console.log('Admin created: admin@demogym.com / Admin1234!');
  } else {
    console.log('Admin already exists, skipping');
  }

  // 6. Company Owner
  const existingOwner = await userRepo.findOne({
    where: { email: 'owner@demogym.com' },
  });
  if (!existingOwner) {
    const companyOwner = userRepo.create({
      email: 'owner@demogym.com',
      password_hash: await bcrypt.hash('Admin1234!', 10),
      role: UserRole.COMPANY_OWNER,
      company_id: savedCompany.id,
      is_active: true,
    });
    await userRepo.save(companyOwner);
    console.log('Company Owner created: owner@demogym.com / Admin1234!');
  } else {
    console.log('Company Owner already exists, skipping');
  }

  // 7. Client
  const clientRepo = dataSource.getRepository(Client);
  let savedClient = await clientRepo.findOne({
    where: { rfid_code: 'RFID-DEMO-001' },
  });
  if (!savedClient) {
    savedClient = await clientRepo.save(
      clientRepo.create({
        full_name: 'Juan Perez',
        email: 'juan@example.com',
        phone: '3001234567',
        rfid_code: 'RFID-DEMO-001',
        company_id: savedCompany.id,
        is_active: true,
      }),
    );
    console.log(
      `Client created: ${savedClient.full_name} (RFID: RFID-DEMO-001)`,
    );
  } else {
    console.log('Client already exists, skipping');
  }

  // 8. Membership
  const membershipRepo = dataSource.getRepository(Membership);
  const existingMembership = await membershipRepo.findOne({
    where: { client_id: savedClient.id, company_id: savedCompany.id },
  });
  if (!existingMembership) {
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    await membershipRepo.save(
      membershipRepo.create({
        client_id: savedClient.id,
        company_id: savedCompany.id,
        type: MembershipType.MONTHLY,
        start_date: today,
        end_date: endDate,
        is_active: true,
      }),
    );
    console.log('Membership created (active for 1 month)');
  } else {
    console.log('Membership already exists, skipping');
  }

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
