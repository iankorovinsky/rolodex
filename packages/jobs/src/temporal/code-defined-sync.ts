import { ScheduleNotFoundError } from '@temporalio/client';
import { codeDefinedSchedules, CODE_DEFINED_SCHEDULE_PREFIX } from '../schedules/code-defined';
import { getTemporalScheduleClient } from './client';

export async function syncCodeDefinedSchedules() {
  const scheduleClient = await getTemporalScheduleClient();
  const expectedIds = new Set(codeDefinedSchedules.map((schedule) => schedule.scheduleId));

  for (const schedule of codeDefinedSchedules) {
    const { scheduleId, memo, ...definition } = schedule;
    const updateDefinition = {
      spec: definition.spec,
      action: definition.action,
      policies: definition.policies,
      searchAttributes: definition.searchAttributes,
      typedSearchAttributes: definition.typedSearchAttributes,
      state: definition.state,
    };

    try {
      await scheduleClient.getHandle(scheduleId).update(() => updateDefinition);
    } catch (error) {
      if (!(error instanceof ScheduleNotFoundError)) {
        throw error;
      }

      await scheduleClient.create({
        scheduleId,
        ...definition,
        memo,
      });
    }
  }

  for await (const schedule of scheduleClient.list()) {
    if (!schedule.scheduleId.startsWith(CODE_DEFINED_SCHEDULE_PREFIX)) {
      continue;
    }

    if (expectedIds.has(schedule.scheduleId)) {
      continue;
    }

    await scheduleClient.getHandle(schedule.scheduleId).delete();
  }
}
