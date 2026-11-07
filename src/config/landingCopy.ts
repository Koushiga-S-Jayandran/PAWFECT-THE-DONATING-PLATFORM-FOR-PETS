/**
 * Landing Page & Transparent Giving Copy
 */

export const LANDING_COPY = {
  hero: {
    headline: 'Send a real gift to shelter paws. 100% direct, zero fee.',
    subhead:
      'Choose a specific gift—from a wholesome meal to a reflective collar—and pay directly to verified animal shelters in Tamil Nadu and Kerala via UPI.',
    ctaPrimary: 'Choose a Gift',
    ctaSecondary: 'Browse Shelters',
  },
  trustPillars: [
    {
      title: '100% Direct to Shelter',
      description:
        'Pawfect never holds or touches donor funds. Your payment transfers directly to the shelter’s verified bank account via UPI.',
    },
    {
      title: '0% Platform Fee',
      description:
        'Hosted completely on Google Cloud’s free Spark infrastructure. Every single rupee goes towards animal care.',
    },
    {
      title: 'Verified Shelter Premises',
      description:
        'Every listed sanctuary is independently vetted with registration numbers, contact verification, and premise validation.',
    },
    {
      title: 'Photo Proof Delivery',
      description:
        'Shelters receive direct item designations and verify gift delivery with direct photographic documentation.',
    },
  ],
  giftFlow: {
    step1: 'Pick a meaningful gift from the catalog',
    step2: 'Select a verified shelter in Tamil Nadu or Kerala',
    step3: 'Scan and pay directly via any UPI app',
    step4: 'Receive confirmation and impact tracking',
  },
} as const;
