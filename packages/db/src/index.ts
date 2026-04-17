import './global.js';

export { prisma } from './client.js'; // exports instance of prisma
export { Prisma } from '../generated/client/client.js';
export * from '../generated/client/enums.js';
export type * from '../generated/client/client.js';
