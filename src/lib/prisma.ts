// File: lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma Client instance.
// This helps prevent creating multiple instances during development hot-reloading.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Instantiate PrismaClient.
// In production, it creates a new instance.
// In development, it checks if an instance already exists on the global object.
// If not, it creates one and assigns it to the global object.
const prismadb = globalThis.prisma || new PrismaClient();

// If not in production, assign the created instance to the global object.
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prismadb;

// Export the single instance.
export default prismadb;
