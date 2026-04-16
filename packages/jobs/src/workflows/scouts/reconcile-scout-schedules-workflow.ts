import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../actions/scouts';

const { reconcileScoutSchedulesActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

export async function reconcileScoutSchedulesWorkflow() {
  return reconcileScoutSchedulesActivity();
}
