import { Client, Connection, ScheduleClient } from '@temporalio/client';

let connectionPromise: Promise<Connection> | null = null;
let clientPromise: Promise<Client> | null = null;
let scheduleClientPromise: Promise<ScheduleClient> | null = null;

function normalizeTemporalAddress(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function getTemporalAddress() {
  const raw = process.env.TEMPORAL_SERVER_URL || 'localhost:7233';
  return normalizeTemporalAddress(raw);
}

export function getTemporalNamespace() {
  return process.env.TEMPORAL_NAMESPACE || 'rolodex';
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
