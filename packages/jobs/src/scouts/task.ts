import { schedules, task } from '@trigger.dev/sdk/v3';
import { executeScout } from './executor';

export const SCOUT_EXECUTION_TASK_ID = 'scout-execute';
export const SCOUT_SCHEDULED_EXECUTION_TASK_ID = 'scout-execute-scheduled';

export interface ScoutExecutionPayload {
  scoutId: string;
  trigger: 'manual' | 'scheduled';
}

export const executeScoutTask = task({
  id: SCOUT_EXECUTION_TASK_ID,
  run: async (payload: ScoutExecutionPayload) => {
    return executeScout(payload);
  },
});

export const executeScheduledScoutTask = schedules.task({
  id: SCOUT_SCHEDULED_EXECUTION_TASK_ID,
  run: async (payload) => {
    const scoutId = payload.externalId?.replace(/^scout:/, '');

    if (!scoutId) {
      throw new Error('Scheduled scout run missing externalId.');
    }

    return executeScout({
      scoutId,
      trigger: 'scheduled',
    });
  },
});
