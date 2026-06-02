export const config = {
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/seat_reservation",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  port: parseInt(process.env.PORT || "3000", 10),
  session: {
    defaultTtl: 60 * 60 * 24, // 24 hours
    persistentTtl: 60 * 60 * 24 * 90, // 90 days
  },
  hold: {
    ttl: 60 * 5, // 5 minutes
  },
};
