/**
 * Animal Types Registry
 * Defines allowable shelter animal types and their presentation labels.
 */

export const ANIMAL_TYPES = [
  { id: 'DOG', label: 'Dogs & Puppies' },
  { id: 'CAT', label: 'Cats & Kittens' },
  { id: 'COW', label: 'Cows & Cattle' },
  { id: 'BIRD', label: 'Birds & Avian' },
  { id: 'HORSE', label: 'Horses & Donkeys' },
  { id: 'OTHER', label: 'Other Rescues' },
] as const;

export type AnimalTypeId = (typeof ANIMAL_TYPES)[number]['id'];

export const VALID_ANIMAL_TYPE_IDS: readonly string[] = ANIMAL_TYPES.map((a) => a.id);

export function getAnimalTypeLabel(id: string): string {
  const match = ANIMAL_TYPES.find((a) => a.id === id);
  return match ? match.label : id;
}
