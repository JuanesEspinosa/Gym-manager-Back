import { AppDataSource } from '../data-source';

async function main() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  console.log('Running pending migrations...');
  const migrations = await AppDataSource.runMigrations();
  if (migrations.length === 0) {
    console.log('No pending migrations.');
  } else {
    migrations.forEach((m) => console.log(`  ✓ ${m.name}`));
  }
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
