import type { ScheduleOptions, ScheduleOptionsStartWorkflowAction } from '@temporalio/client';
import { ScheduleOverlapPolicy } from '@temporalio/client';
import {
  getScoutScheduleReconcileWorkflowId,
  RECONCILE_SCOUT_SCHEDULES_WORKFLOW,
  SCOUTS_TASK_QUEUE,
} from '../workflows';

export const CODE_DEFINED_SCHEDULE_PREFIX = 'rolodex:code:';

type CodeDefinedSchedule = ScheduleOptions<ScheduleOptionsStartWorkflowAction<any>> & {
  state: NonNullable<ScheduleOptions['state']>;
};

export const codeDefinedSchedules: CodeDefinedSchedule[] = [
  {
    scheduleId: `${CODE_DEFINED_SCHEDULE_PREFIX}reconcile-scout-schedules`,
    spec: {
      cronExpressions: ['*/5 * * * *'],
      timezone: 'UTC',
    },
    action: {
      type: 'startWorkflow' as const,
      workflowType: RECONCILE_SCOUT_SCHEDULES_WORKFLOW,
      taskQueue: SCOUTS_TASK_QUEUE,
      args: [],
      workflowId: getScoutScheduleReconcileWorkflowId(),
    },
    policies: {
      overlap: ScheduleOverlapPolicy.SKIP,
    },
    state: {
      paused: false,
      note: 'Managed by @rolodex/jobs',
    },
    memo: {
      source: 'rolodex.jobs.code-defined',
    },
  },
];
