import { reconcileScoutSchedules } from '../../temporal/scout-schedules';

export async function reconcileScoutSchedulesActivity() {
  await reconcileScoutSchedules();

  return {
    reconciledAt: new Date().toISOString(),
  };
}
