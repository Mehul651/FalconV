'use strict';

const generated = require('./src/generated/client');

const globalForPrisma = globalThis;
const prisma =
  globalForPrisma.__falconvPrisma ??
  new generated.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__falconvPrisma = prisma;
}

module.exports = {
  prisma,
  ...generated,
};
