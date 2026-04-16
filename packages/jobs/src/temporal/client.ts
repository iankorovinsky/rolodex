import { Client, Connection, ScheduleClient } from '@temporalio/client';

let connectionPromise: Promise<Connection> | null = null;
let clientPromise: Promise<Client> | null = null;
let scheduleClientPromise: Promise<ScheduleClient> | null = null;

export function getTemporalAddress() {
  return process.env.TEMPORAL_ADDRESS || 'localhost:7233';
}

export function getTemporalNamespace() {
  return process.env.TEMPORAL_NAMESPACE || 'default';
}

async function createConnection() {
  return Connection.connect({
    address: getTemporalAddress(),
  });
}

export async function getTemporalConnection() {
  connectionPromise ??= createConnection();
  return connectionPromise;
}

export async function getTemporalClient() {
  clientPromise ??= (async () => {
    const connection = await getTemporalConnection();

    return new Client({
      connection,
      namespace: getTemporalNamespace(),
    });
  })();

  return clientPromise;
}

export async function getTemporalScheduleClient() {
  scheduleClientPromise ??= (async () => {
    const connection = await getTemporalConnection();

    return new ScheduleClient({
      connection,
      namespace: getTemporalNamespace(),
    });
  })();

  return scheduleClientPromise;
}
