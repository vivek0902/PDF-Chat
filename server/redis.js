import IORedis from "ioredis";

const parseRedisUrl = (url) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: decodeURIComponent(parsed.username || "default"),
    password: decodeURIComponent(parsed.password || ""),
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
};

const redisUrl = process.env.REDIS_URL;
const redisConfig = redisUrl
  ? parseRedisUrl(redisUrl)
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      username: process.env.REDIS_USER || "default",
      password: process.env.REDIS_PASSWORD || "",
      ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
    };

export const redisConnection = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: null,
});
