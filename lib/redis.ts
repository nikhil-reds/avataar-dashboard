import net from 'node:net';

type RedisValue = string | null;

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';
const REDIS_TIMEOUT_MS = 700;

function redisUrl() {
  return new URL(process.env.REDIS_URL ?? DEFAULT_REDIS_URL);
}

function encodeCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join('')}`;
}

function parseBulkString(buffer: Buffer): RedisValue {
  const data = buffer.toString('utf8');
  if (data.startsWith('$-1')) return null;
  if (data.startsWith('+')) return data.slice(1).split('\r\n')[0] ?? '';
  if (data.startsWith('-')) throw new Error(data.slice(1).split('\r\n')[0] ?? 'Redis error');
  if (!data.startsWith('$')) return null;

  const separator = data.indexOf('\r\n');
  const length = Number(data.slice(1, separator));
  if (!Number.isFinite(length) || length < 0) return null;
  return data.slice(separator + 2, separator + 2 + length);
}

async function sendRedisCommand(parts: string[]): Promise<RedisValue> {
  const url = redisUrl();
  const socket = net.createConnection({
    host: url.hostname,
    port: Number(url.port || 6379),
  });

  socket.setTimeout(REDIS_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.on('connect', () => {
      const commands: string[] = [];
      if (url.password) commands.push(encodeCommand(['AUTH', decodeURIComponent(url.password)]));
      commands.push(encodeCommand(parts));
      socket.write(commands.join(''));
    });

    socket.on('data', (chunk) => {
      chunks.push(chunk);
      finish(() => {
        try {
          const joined = Buffer.concat(chunks);
          const responses = joined.toString('utf8').split(/\r\n(?=[+$:-])/);
          resolve(parseBulkString(Buffer.from(responses.at(-1) ?? joined)));
        } catch (err) {
          reject(err);
        }
      });
    });
    socket.on('end', () => {
      finish(() => {
        try {
          const joined = Buffer.concat(chunks);
          const responses = joined.toString('utf8').split(/\r\n(?=[+$:-])/);
          resolve(parseBulkString(Buffer.from(responses.at(-1) ?? joined)));
        } catch (err) {
          reject(err);
        }
      });
    });
    socket.on('timeout', () => finish(() => reject(new Error('Redis timed out'))));
    socket.on('error', (err) => finish(() => reject(err)));
  });
}

export async function redisGet(key: string): Promise<string | null> {
  return sendRedisCommand(['GET', key]);
}

export async function redisSetEx(key: string, seconds: number, value: string): Promise<void> {
  await sendRedisCommand(['SETEX', key, String(seconds), value]);
}
