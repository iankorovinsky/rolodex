export const SCOUTS_TASK_QUEUE = 'scouts';
export const EXECUTE_SCOUT_WORKFLOW = 'executeScoutWorkflow';
export const RECONCILE_SCOUT_SCHEDULES_WORKFLOW = 'reconcileScoutSchedulesWorkflow';

export interface ScoutExecutionPayload {
  scoutId: string;
  trigger: 'manual' | 'scheduled';
}

export function getScoutScheduleId(scoutId: string) {
  return `scout:${scoutId}`;
}

export function getManualScoutWorkflowId(scoutId: string) {
  return `scout-manual:${scoutId}:${Date.now()}`;
}

export function getScheduledScoutWorkflowId(scoutId: string) {
  return `scout-scheduled:${scoutId}`;
}

export function getScoutScheduleReconcileWorkflowId() {
  return 'rolodex:system:reconcile-scout-schedules';
}
