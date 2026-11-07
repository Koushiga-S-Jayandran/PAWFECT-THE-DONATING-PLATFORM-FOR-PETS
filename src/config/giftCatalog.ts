/**
 * Gift Catalog (Single Source of Truth)
 *
 * Gift names, captions, prices (in paise), minimums, and image file paths
 * are declared ONLY here. The gift picker, quantity selector, review step,
 * donation records, and Firestore rules all derive from this catalog.
 */

export type GiftCategory =
  | 'MEALS'
  | 'HEALTHCARE'
  | 'SAFETY'
  | 'SPONSORSHIP'
  | 'CELEBRATION'
  | 'CUSTOM';

export interface GiftCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly caption: string;
  readonly unitPricePaise: number;
  readonly minQuantity: number;
  readonly maxQuantity: number;
  readonly category: GiftCategory;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly isCustom: boolean;
  readonly impactDescription: string;
}

export const GIFT_CATALOG: readonly GiftCatalogItem[] = [
  {
    id: 'one-meal',
    name: 'One Wholesome Meal',
    caption: 'Feed one rescue dog or cat a warm, nutritious meal today.',
    unitPricePaise: 50 * 100, // ₹50
    minQuantity: 1,
    maxQuantity: 100,
    category: 'MEALS',
    imagePath: '/images/gifts/one-meal.webp',
    imageAlt:
      'A golden-brown Indian street dog and a small tabby cat eating side by side from a steel bowl at dusk, gentle steam rising.',
    isCustom: false,
    impactDescription: 'Provides fresh rice, boiled chicken/egg, and broth for one animal.',
  },
  {
    id: 'family-meal-pack',
    name: 'Family Meal Pack',
    caption: 'Feed a small pack of 5 rescue dogs and cats in the shelter courtyard.',
    unitPricePaise: 250 * 100, // ₹250
    minQuantity: 1,
    maxQuantity: 50,
    category: 'MEALS',
    imagePath: '/images/gifts/family-meal-pack.webp',
    imageAlt:
      'A dog, a cat and a few more rescue animals around a row of steel bowls in a shelter courtyard in morning light.',
    isCustom: false,
    impactDescription: 'Complete morning feast for an entire enclosure of rescued animals.',
  },
  {
    id: 'fresh-water-bowls',
    name: 'Fresh Clean Water Bowls',
    caption: 'Provide durable stainless steel water bowls and clean water refills.',
    unitPricePaise: 150 * 100, // ₹150
    minQuantity: 1,
    maxQuantity: 20,
    category: 'MEALS',
    imagePath: '/images/gifts/fresh-water-bowls.webp',
    imageAlt:
      'A dog and a cat drinking from the same clean water bowl on a hot sunny day, sunlight sparkling on the water.',
    isCustom: false,
    impactDescription: 'Keeps rescue animals hydrated through warm Indian summer days.',
  },
  {
    id: 'vaccination',
    name: 'Essential Vaccination Dose',
    caption: 'Anti-rabies and 7-in-1 combo immunization for one rescue animal.',
    unitPricePaise: 450 * 100, // ₹450
    minQuantity: 1,
    maxQuantity: 30,
    category: 'HEALTHCARE',
    imagePath: '/images/gifts/vaccination.webp',
    imageAlt:
      'A calm dog resting its head on a vet’s gloved hand while a cat sits beside it, in a clean bright clinic.',
    isCustom: false,
    impactDescription: 'Protects from parvo, distemper, and deadly rabies for a full year.',
  },
  {
    id: 'deworming-tick-care',
    name: 'Deworming & Tick Treatment',
    caption: 'Relieve a rescue dog or cat from parasitic discomfort and infections.',
    unitPricePaise: 300 * 100, // ₹300
    minQuantity: 1,
    maxQuantity: 30,
    category: 'HEALTHCARE',
    imagePath: '/images/gifts/deworming-tick-care.webp',
    imageAlt:
      'A dog and a cat curled up together on a clean blanket, relaxed, soft afternoon light.',
    isCustom: false,
    impactDescription: 'Medicated spot-on and oral dewormer ensuring healthy weight and comfort.',
  },
  {
    id: 'sterilisation-support',
    name: 'Sterilisation & Post-Op Care',
    caption: 'Humane birth control surgery with 7-day antibiotic recovery support.',
    unitPricePaise: 1500 * 100, // ₹1,500
    minQuantity: 1,
    maxQuantity: 10,
    category: 'HEALTHCARE',
    imagePath: '/images/gifts/sterilisation-support.webp',
    imageAlt:
      'A mother dog and a mother cat resting peacefully in a clean recovery area with a soft blanket and warm light.',
    isCustom: false,
    impactDescription: 'Prevents street suffering and extends life expectancy with safe veterinary surgery.',
  },
  {
    id: 'emergency-treatment',
    name: 'Emergency Rescue First-Aid',
    caption: 'Urgent wound care, sterile dressing, painkillers and IV fluids.',
    unitPricePaise: 1000 * 100, // ₹1,000
    minQuantity: 1,
    maxQuantity: 10,
    category: 'HEALTHCARE',
    imagePath: '/images/gifts/emergency-treatment.webp',
    imageAlt:
      'A dog with a neat white bandage on its leg resting in a soft bed with a cat sitting close beside it; gentle and hopeful.',
    isCustom: false,
    impactDescription: 'Life-saving stabilization for road accident and trauma victims.',
  },
  {
    id: 'reflective-collar',
    name: 'Reflective Safety Collar',
    caption: 'Life-saving high-visibility collar to prevent night vehicle accidents.',
    unitPricePaise: 120 * 100, // ₹120
    minQuantity: 1,
    maxQuantity: 50,
    category: 'SAFETY',
    imagePath: '/images/gifts/reflective-collar.webp',
    imageAlt:
      'A street dog wearing a reflective collar that catches car headlights, with a cat beside it at a quiet roadside at night, blue-hour light.',
    isCustom: false,
    impactDescription: 'Alerts drivers up to 200 meters away on unlit village and highway roads.',
  },
  {
    id: 'sponsor-month',
    name: 'Sponsor a Shelter Animal for a Month',
    caption: 'Cover complete food, medicine, and shelter care for 30 full days.',
    unitPricePaise: 2500 * 100, // ₹2,500
    minQuantity: 1,
    maxQuantity: 5,
    category: 'SPONSORSHIP',
    imagePath: '/images/gifts/sponsor-month.webp',
    imageAlt:
      'A dog and a cat sitting together at a shelter gate at sunrise, looking out calmly.',
    isCustom: false,
    impactDescription: 'Guarantees comprehensive foster protection with monthly progress photos.',
  },
  {
    id: 'sponsor-year',
    name: 'Sponsor a Guardian Year',
    caption: 'Be the guardian angel for a permanent senior or handicapped resident for a year.',
    unitPricePaise: 25000 * 100, // ₹25,000
    minQuantity: 1,
    maxQuantity: 2,
    category: 'SPONSORSHIP',
    imagePath: '/images/gifts/sponsor-year.webp',
    imageAlt:
      'A dog and a cat curled up asleep together in a warm cosy corner, soft light through a window.',
    isCustom: false,
    impactDescription: 'Full annual sponsorship supporting sanctuary residents who cannot be adopted.',
  },
  {
    id: 'birthday-gift',
    name: 'Birthday Blessing Gift',
    caption: 'Celebrate your birthday or a loved one’s special day by feeding shelter animals.',
    unitPricePaise: 500 * 100, // ₹500
    minQuantity: 1,
    maxQuantity: 20,
    category: 'CELEBRATION',
    imagePath: '/images/gifts/birthday-gift.webp',
    imageAlt:
      'A dog and a cat beside a small plain bowl of food with a single unlit candle, warm light, no balloons, no text.',
    isCustom: false,
    impactDescription: 'Turns your celebration into warm meals and clean beds for innocent paws.',
  },
  {
    id: 'anniversary-gift',
    name: 'Anniversary Celebration Gift',
    caption: 'Honor your marriage or partnership milestone with a gift of love and care.',
    unitPricePaise: 1000 * 100, // ₹1,000
    minQuantity: 1,
    maxQuantity: 10,
    category: 'CELEBRATION',
    imagePath: '/images/gifts/anniversary-gift.webp',
    imageAlt:
      'A dog and a cat sitting close shoulder to shoulder as the sun sets behind them.',
    isCustom: false,
    impactDescription: 'Celebrates enduring love by healing and nurturing companion animals.',
  },
  {
    id: 'in-memory-of',
    name: 'In Loving Memory Gift',
    caption: 'Dedicate a gift in remembrance of a beloved pet or family member who passed.',
    unitPricePaise: 1000 * 100, // ₹1,000
    minQuantity: 1,
    maxQuantity: 10,
    category: 'CELEBRATION',
    imagePath: '/images/gifts/in-memory-of.webp',
    imageAlt:
      'A dog and a cat sitting quietly near a window as soft light falls across them, a single candle on the sill.',
    isCustom: false,
    impactDescription: 'A lasting tribute to an unforgettable soul, keeping their spirit alive in paws saved.',
  },
  {
    id: 'custom-amount',
    name: 'Custom Shelter Contribution',
    caption: 'Choose any heartfelt amount to help this shelter where they need it most.',
    unitPricePaise: 0, // variable
    minQuantity: 1,
    maxQuantity: 1,
    category: 'CUSTOM',
    imagePath: '/images/gifts/custom-amount.webp',
    imageAlt: 'A dog gently nudging a cat with its nose, both in soft light.',
    isCustom: true,
    impactDescription: 'Goes directly to the shelter’s current top priority emergency or operational bill.',
  },
] as const;

export function getAllGifts(): readonly GiftCatalogItem[] {
  return GIFT_CATALOG;
}

export function getGiftById(id: string): GiftCatalogItem | undefined {
  return GIFT_CATALOG.find((g) => g.id === id);
}

export function isValidGiftId(id: string): boolean {
  return GIFT_CATALOG.some((g) => g.id === id);
}
