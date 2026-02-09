import 'dotenv/config';
import Redis from 'ioredis';

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is missing. Set it in apps/api/.env');
  }

  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 7000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  client.on('error', () => {
    // Swallow here; we report failures via the thrown error below.
  });
  try {
    await client.connect();
    const pong = await client.ping();
    // eslint-disable-next-line no-console
    console.log(pong);
  } finally {
    await client.quit();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[redis:ping] failed:', error?.message ?? error);
  process.exit(1);
});
