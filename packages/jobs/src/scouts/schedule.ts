import type { Scout, ScoutScheduleUnit, ScoutWeekday } from '@rolodex/types';

type ScoutScheduleShape = Pick<
  Scout,
  'scheduleUnit' | 'scheduleInterval' | 'scheduleDayOfWeek' | 'scheduleTimeLocal' | 'timezone'
> & { scheduleAnchorAt: string | Date };

const WEEKDAY_TO_INDEX: Record<ScoutWeekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_VALUES = Object.keys(WEEKDAY_TO_INDEX) as ScoutWeekday[];

function parseTimeLocal(timeLocal: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeLocal);
  if (!match) {
    throw new Error('Invalid local time format. Expected HH:MM.');
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const offsetValue = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(offsetValue);

  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes);
}

function getLocalParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date);
  const entries = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = entries.weekday.toLowerCase() as ScoutWeekday;

  return {
    year: Number(entries.year),
    month: Number(entries.month),
    day: Number(entries.day),
    hour: Number(entries.hour),
    minute: Number(entries.minute),
    second: Number(entries.second),
    weekday,
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function addCalendarDays(
  date: Date,
  timeZone: string,
  daysToAdd: number,
  hour: number,
  minute: number
) {
  const parts = getLocalParts(date, timeZone);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToAdd, hour, minute));
  const shiftedParts = getLocalParts(shifted, 'UTC');

  return zonedDateTimeToUtc(
    shiftedParts.year,
    shiftedParts.month,
    shiftedParts.day,
    hour,
    minute,
    timeZone
  );
}

function findFirstOccurrence(schedule: ScoutScheduleShape) {
  const anchor = new Date(schedule.scheduleAnchorAt);
  const { hour, minute } = parseTimeLocal(schedule.scheduleTimeLocal);
  const anchorParts = getLocalParts(anchor, schedule.timezone);
  let candidate = zonedDateTimeToUtc(
    anchorParts.year,
    anchorParts.month,
    anchorParts.day,
    hour,
    minute,
    schedule.timezone
  );

  if (schedule.scheduleUnit === 'day') {
    if (candidate < anchor) {
      candidate = addCalendarDays(candidate, schedule.timezone, 1, hour, minute);
    }
    return candidate;
  }

  if (!schedule.scheduleDayOfWeek) {
    throw new Error('Weekly schedules require a day of week.');
  }

  const targetIndex = WEEKDAY_TO_INDEX[schedule.scheduleDayOfWeek];
  const currentIndex = WEEKDAY_TO_INDEX[anchorParts.weekday];
  const dayDelta = (targetIndex - currentIndex + 7) % 7;
  candidate = addCalendarDays(candidate, schedule.timezone, dayDelta, hour, minute);

  if (candidate < anchor) {
    candidate = addCalendarDays(candidate, schedule.timezone, 7, hour, minute);
  }

  return candidate;
}

export function getNextScoutRunAt(schedule: ScoutScheduleShape, from = new Date()) {
  const { hour, minute } = parseTimeLocal(schedule.scheduleTimeLocal);
  let candidate = findFirstOccurrence(schedule);
  let safety = 0;

  while (candidate <= from && safety < 10_000) {
    candidate =
      schedule.scheduleUnit === 'day'
        ? addCalendarDays(
            candidate,
            schedule.timezone,
            schedule.scheduleInterval,
            hour,
            minute
          )
        : addCalendarDays(
            candidate,
            schedule.timezone,
            schedule.scheduleInterval * 7,
            hour,
            minute
          );
    safety += 1;
  }

  return candidate;
}

export function isScoutDueAt(schedule: ScoutScheduleShape, at = new Date()) {
  const localParts = getLocalParts(at, schedule.timezone);
  const { hour, minute } = parseTimeLocal(schedule.scheduleTimeLocal);

  if (localParts.hour !== hour || localParts.minute !== minute) {
    return false;
  }

  const anchor = findFirstOccurrence(schedule);
  const anchorParts = getLocalParts(anchor, schedule.timezone);

  if (schedule.scheduleUnit === 'day') {
    const localDay = Date.UTC(localParts.year, localParts.month - 1, localParts.day) / 86_400_000;
    const anchorDay =
      Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day) / 86_400_000;
    return (localDay - anchorDay) % schedule.scheduleInterval === 0;
  }

  if (!schedule.scheduleDayOfWeek) {
    return false;
  }

  const localDay = Date.UTC(localParts.year, localParts.month - 1, localParts.day) / 86_400_000;
  const anchorDay =
    Date.UTC(anchorParts.year, anchorParts.month - 1, anchorParts.day) / 86_400_000;

  return (
    localParts.weekday === schedule.scheduleDayOfWeek &&
    (localDay - anchorDay) % (schedule.scheduleInterval * 7) === 0
  );
}

export function buildScoutCron(
  scheduleUnit: ScoutScheduleUnit,
  scheduleDayOfWeek: ScoutWeekday | null,
  scheduleTimeLocal: string
) {
  const { hour, minute } = parseTimeLocal(scheduleTimeLocal);

  if (scheduleUnit === 'day') {
    return `${minute} ${hour} * * *`;
  }

  if (!scheduleDayOfWeek) {
    throw new Error('Weekly schedules require a day of week.');
  }

  return `${minute} ${hour} * * ${WEEKDAY_TO_INDEX[scheduleDayOfWeek]}`;
}

export function formatScoutCadence(schedule: ScoutScheduleShape) {
  if (schedule.scheduleUnit === 'day') {
    return schedule.scheduleInterval === 1
      ? 'Every day'
      : `Every ${schedule.scheduleInterval} days`;
  }

  return schedule.scheduleInterval === 1
    ? `Every week on ${schedule.scheduleDayOfWeek ?? WEEKDAY_VALUES[0]}`
    : `Every ${schedule.scheduleInterval} weeks on ${schedule.scheduleDayOfWeek ?? WEEKDAY_VALUES[0]}`;
}
