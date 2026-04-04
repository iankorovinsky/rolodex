export const SCOUT_SCHEDULE_UNITS = ['day', 'week'] as const;
export type ScoutScheduleUnit = (typeof SCOUT_SCHEDULE_UNITS)[number];

export const SCOUT_WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type ScoutWeekday = (typeof SCOUT_WEEKDAYS)[number];

export const SCOUT_RELEVANCE_WINDOWS = ['day', 'week'] as const;
export type ScoutRelevanceWindow = (typeof SCOUT_RELEVANCE_WINDOWS)[number];

export const SCOUT_STATUSES = ['active', 'paused'] as const;
export type ScoutStatus = (typeof SCOUT_STATUSES)[number];

export interface Scout {
  id: string;
  userId: string;
  name: string;
  topic: string;
  scheduleUnit: ScoutScheduleUnit;
  scheduleInterval: number;
  scheduleDayOfWeek: ScoutWeekday | null;
  scheduleTimeLocal: string;
  timezone: string;
  scheduleAnchorAt: string;
  relevanceWindow: ScoutRelevanceWindow;
  recipientEmails: string[];
  status: ScoutStatus;
  triggerScheduleId: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScoutRequest {
  name: string;
  topic: string;
  scheduleUnit: ScoutScheduleUnit;
  scheduleInterval: number;
  scheduleDayOfWeek?: ScoutWeekday | null;
  scheduleTimeLocal: string;
  timezone: string;
  relevanceWindow: ScoutRelevanceWindow;
  recipientEmails: string[];
}

export interface UpdateScoutRequest {
  name?: string;
  topic?: string;
  scheduleUnit?: ScoutScheduleUnit;
  scheduleInterval?: number;
  scheduleDayOfWeek?: ScoutWeekday | null;
  scheduleTimeLocal?: string;
  timezone?: string;
  relevanceWindow?: ScoutRelevanceWindow;
  recipientEmails?: string[];
}

export interface ScoutRunResponse {
  queued: boolean;
}
