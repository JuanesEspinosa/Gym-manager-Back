import { AppDataSource } from '../data-source';

async function main() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const hasPending = await AppDataSource.showMigrations();
  console.log(hasPending ? 'Pending migrations exist.' : 'All migrations are up to date.');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Error checking migrations:', err);
  process.exit(1);
});
