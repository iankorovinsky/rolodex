import { executeScout } from './executor';
import type { ScoutExecutionPayload } from '../../workflows/scouts';

export async function executeScoutActivity(payload: ScoutExecutionPayload) {
  return executeScout(payload);
}
