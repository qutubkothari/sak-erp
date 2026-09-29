export const AUTOHEAL_PATCH_QUEUE = 'autoheal-patch';

// Both producers and consumers must resolve the same endpoint and database.
export function patchRedisOptions(env: NodeJS.ProcessEnv = process.env) {
  if (!env.REDIS_URL) return {
    host: env.REDIS_HOST || '127.0.0.1',
    port: Number(env.REDIS_PORT || 6379),
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  };
  const url = new URL(env.REDIS_URL);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://.');
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;
  if (!Number.isInteger(db) || db < 0) throw new Error('REDIS_URL database path must be a non-negative integer.');
  return { host: url.hostname, port: Number(url.port || 6379), db,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
