/**
 * Urgency Levels Registry
 * Defines allowable shelter urgency statuses and their semantic labels.
 */

export const URGENCY_LEVELS = [
  {
    id: 'NORMAL',
    label: 'Normal care',
    description: 'Ongoing routine sustenance, shelter, and upkeep.',
  },
  {
    id: 'URGENT',
    label: 'Urgent need',
    description: 'Upcoming food exhaustion, seasonal care, or post-op treatments.',
  },
  {
    id: 'CRITICAL',
    label: 'Critical emergency',
    description: 'Immediate medical distress, natural disaster, or critical food shortage.',
  },
] as const;

export type UrgencyLevelId = (typeof URGENCY_LEVELS)[number]['id'];

export const VALID_URGENCY_IDS: readonly string[] = URGENCY_LEVELS.map((u) => u.id);

export function getUrgencyLevel(id: string) {
  return URGENCY_LEVELS.find((u) => u.id === id);
}
