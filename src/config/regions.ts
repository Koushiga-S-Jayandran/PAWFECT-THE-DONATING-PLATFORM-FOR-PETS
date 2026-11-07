/**
 * Region & District Registry (Open/Closed Principle)
 * Only Tamil Nadu (TN) and Kerala (KL) are enabled in this step.
 * To add a new state, add a RegionDefinition object here and update enabledStates() in firestore.rules.
 */

export interface RegionDefinition {
  readonly code: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly districts: readonly string[];
}

export const REGIONS: readonly RegionDefinition[] = [
  {
    code: 'TN',
    name: 'Tamil Nadu',
    enabled: true,
    districts: [
      'Ariyalur',
      'Chengalpattu',
      'Chennai',
      'Coimbatore',
      'Cuddalore',
      'Dharmapuri',
      'Dindigul',
      'Erode',
      'Kallakurichi',
      'Kancheepuram',
      'Kanniyakumari',
      'Karur',
      'Krishnagiri',
      'Madurai',
      'Mayiladuthurai',
      'Nagapattinam',
      'Namakkal',
      'Perambalur',
      'Pudukkottai',
      'Ramanathapuram',
      'Ranipet',
      'Salem',
      'Sivaganga',
      'Tenkasi',
      'Thanjavur',
      'The Nilgiris',
      'Theni',
      'Thiruvallur',
      'Thiruvarur',
      'Thoothukudi',
      'Tiruchirappalli',
      'Tirunelveli',
      'Tirupathur',
      'Tiruppur',
      'Tiruvannamalai',
      'Vellore',
      'Viluppuram',
      'Virudhunagar',
    ],
  },
  {
    code: 'KL',
    name: 'Kerala',
    enabled: true,
    districts: [
      'Thiruvananthapuram',
      'Kollam',
      'Pathanamthitta',
      'Alappuzha',
      'Kottayam',
      'Idukki',
      'Ernakulam',
      'Thrissur',
      'Palakkad',
      'Malappuram',
      'Kozhikode',
      'Wayanad',
      'Kannur',
      'Kasaragod',
    ],
  },
] as const;

export function getEnabledRegions(): readonly RegionDefinition[] {
  return REGIONS.filter((r) => r.enabled);
}

export function getRegionByCode(code: string): RegionDefinition | undefined {
  return REGIONS.find((r) => r.code === code);
}

export function isStateCodeEnabled(code: string): boolean {
  return REGIONS.some((r) => r.code === code && r.enabled);
}

export const isStateEnabled = isStateCodeEnabled;

export function getEnabledStates(): string[] {
  return getEnabledRegions().map((r) => r.code);
}

export function getDistrictsForState(code: string): readonly string[] {
  const reg = getRegionByCode(code);
  return reg ? reg.districts : [];
}

export function isValidDistrictForState(stateCode: string, district: string): boolean {
  const region = getRegionByCode(stateCode);
  if (!region || !region.enabled) return false;
  return region.districts.includes(district);
}

export function getAllDistrictsForEnabledRegions(): { stateCode: string; stateName: string; district: string }[] {
  const list: { stateCode: string; stateName: string; district: string }[] = [];
  for (const reg of getEnabledRegions()) {
    for (const dist of reg.districts) {
      list.push({ stateCode: reg.code, stateName: reg.name, district: dist });
    }
  }
  return list;
}
