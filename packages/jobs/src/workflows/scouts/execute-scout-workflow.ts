import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../actions/scouts';
import type { ScoutExecutionPayload } from './shared';

const { executeScoutActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

export async function executeScoutWorkflow(payload: ScoutExecutionPayload) {
  return executeScoutActivity(payload);
}
