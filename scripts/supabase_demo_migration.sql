-- ============================================================================
-- Supabase / PostgreSQL Demo Migration & Seed Script for Pawfect
-- Idempotent: Uses IF NOT EXISTS, ON CONFLICT DO UPDATE / DO NOTHING.
-- ============================================================================

-- 1. ADD is_demo COLUMN TO SHELTERS AND PETS TABLES
ALTER TABLE IF EXISTS shelters 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS pets 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- 2. SEED 8 DEMO SHELTERS ACROSS INDIAN CITIES
INSERT INTO shelters (
  id,
  name,
  state,
  state_code,
  district,
  area,
  animal_types,
  description,
  urgency,
  urgency_note,
  verified,
  status,
  status_version,
  resubmit_count,
  created_at,
  updated_at,
  approved_at,
  is_demo
) VALUES 
  (
    'demo_shelter_cbe',
    '[DEMO] Coimbatore Paws Animal Rescue',
    'TAMIL_NADU',
    'TN',
    'Coimbatore',
    'RS Puram',
    ARRAY['DOGS', 'CATS', 'CATTLE'],
    'A dedicated demonstration animal rescue shelter in Coimbatore caring for injured street dogs, orphaned kittens, and community cattle with 24/7 emergency veterinary response.',
    'URGENT',
    'Urgent requirement for puppy booster vaccines and rice meal bags.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_chennai',
    '[DEMO] Chennai Street Paws Sanctuary',
    'TAMIL_NADU',
    'TN',
    'Chennai',
    'Mylapore',
    ARRAY['DOGS', 'CATS'],
    'Demonstration shelter in Chennai providing sterilisation, vaccination, and loving hospice care for abandoned senior dogs and special-needs felines.',
    'NORMAL',
    'Regular seasonal supply of anti-tick treatments and kitten formula.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_kochi',
    '[DEMO] Kochi Coastal Animal Haven',
    'KERALA',
    'KL',
    'Ernakulam',
    'Fort Kochi',
    ARRAY['DOGS', 'CATS', 'BIRDS'],
    'Demonstration animal rescue sanctuary near the Kerala coast offering medical rehabilitation, bird aviaries, and community neutering clinics.',
    'CRITICAL',
    'Monsoon emergency shelter repair and clean drinking water filtration bowls needed.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_tvm',
    '[DEMO] Trivandrum Companion Shelter',
    'KERALA',
    'KL',
    'Thiruvananthapuram',
    'Kowdiar',
    ARRAY['DOGS', 'CATS'],
    'Demonstration non-profit animal rescue home helping injured street animals across South Kerala with comprehensive trauma and post-surgery care.',
    'NORMAL',
    'Ongoing medical care support for rehabilitated indie companions.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_madurai',
    '[DEMO] Madurai Heritage Pet Care',
    'TAMIL_NADU',
    'TN',
    'Madurai',
    'KK Nagar',
    ARRAY['DOGS', 'CATS', 'CATTLE'],
    'Demonstration welfare shelter focused on traditional Indian native breeds, heatwave hydration bowls, and community animal birth control.',
    'URGENT',
    'Urgent requirement for summer hydration tubs and reflective night-safety collars.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_salem',
    '[DEMO] Salem Four-Legged Friends Care',
    'TAMIL_NADU',
    'TN',
    'Salem',
    'Hasthampatti',
    ARRAY['DOGS', 'CATS'],
    'Demonstration community rescue home rehabilitating paralyzed dogs, abandoned farm animals, and malnourished kittens.',
    'NORMAL',
    'Daily meal support and joint care supplements for recovery wards.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_calicut',
    '[DEMO] Kozhikode Stray & Animal Rescue',
    'KERALA',
    'KL',
    'Kozhikode',
    'Beach Road',
    ARRAY['DOGS', 'CATS'],
    'Demonstration welfare group fostering rescue puppies, providing rabies inoculations, and operating ambulance transport.',
    'URGENT',
    'Urgent emergency veterinary medications and suture supplies.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'demo_shelter_nilgiris',
    '[DEMO] Ooty & Nilgiris Animal Trust',
    'TAMIL_NADU',
    'TN',
    'The Nilgiris',
    'Coonoor',
    ARRAY['DOGS', 'CATS', 'HORSES'],
    'High-altitude demonstration rescue shelter protecting working equines, hill-station community indies, and abandoned mountain cats.',
    'CRITICAL',
    'Winter thermal fleece bedding and high-calorie nutrition supplies needed urgently.',
    TRUE,
    'APPROVED',
    1,
    0,
    NOW(),
    NOW(),
    NOW(),
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_demo = TRUE,
  updated_at = NOW();

-- 3. LABEL EXISTING SAMPLE PETS AS DEMO
UPDATE pets
SET is_demo = TRUE
WHERE id LIKE 'sample_pet_%';

-- ============================================================================
-- HOW TO REMOVE ALL DEMO DATA LATER:
-- Single SQL statement to delete demo shelters:
-- DELETE FROM shelters WHERE is_demo = TRUE;
--
-- To clear the demo flag from pets without deleting rows:
-- UPDATE pets SET is_demo = FALSE WHERE is_demo = TRUE;
-- ============================================================================
