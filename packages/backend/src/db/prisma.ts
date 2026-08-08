import { PrismaClient } from '@prisma/client';

/** Cliente Prisma partilhado por toda a aplicação. */
export const prisma = new PrismaClient();
