import { task, schedules } from '@trigger.dev/sdk/v3';

// Regular task - triggered manually or via SDK
export const helloWorldTask = task({
  id: 'hello-world',
  maxDuration: 300,
  run: async (payload: { name: string }) => {
    console.log(`Hello, ${payload.name}!`);
    return {
      message: `Hello, ${payload.name}!`,
      timestamp: new Date().toISOString(),
    };
  },
});

// Scheduled task - declarative cron schedule defined in code
export const dailyCleanupTask = schedules.task({
  id: 'daily-cleanup',
  // Runs every day at 3am UTC
  cron: '0 3 * * *',
  run: async (payload) => {
    console.log(`Running daily cleanup at ${payload.timestamp.toISOString()}`);
    console.log(`Last run: ${payload.lastTimestamp?.toISOString() ?? 'never'}`);
    console.log(`Timezone: ${payload.timezone}`);
    return { success: true };
  },
});
