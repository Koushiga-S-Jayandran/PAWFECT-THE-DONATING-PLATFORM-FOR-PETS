import { DemoSeedService } from '../src/services/DemoSeedService.js';

async function main() {
  console.log('Seeding demo shelters and labeling sample pets in Firestore...');
  const res = await DemoSeedService.seedDemoSheltersAndPets();
  console.log(`Successfully seeded ${res.sheltersSeeded} demo shelters, updated ${res.petsUpdated} sample pets.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to seed demo data:', err);
  process.exit(1);
});
