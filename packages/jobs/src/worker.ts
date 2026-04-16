import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeConnection, Worker } from '@temporalio/worker';
import { activities } from './actions';
import { reconcileScoutSchedules, syncCodeDefinedSchedules } from './temporal';
import { SCOUTS_TASK_QUEUE } from './workflows';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  await syncCodeDefinedSchedules();
  await reconcileScoutSchedules();

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: SCOUTS_TASK_QUEUE,
    workflowsPath: path.resolve(__dirname, './workflows/index.ts'),
    activities,
  });

  await worker.run();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
