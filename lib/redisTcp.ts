import { createConnection } from 'node:net';
import { connect as connectTls } from 'node:tls';

// One bounded connection per command avoids retaining sockets across dev reloads.
export function redisTcpCommand(url: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(url);
    const commands: unknown[][] = [];
    if (endpoint.password) commands.push(endpoint.username
      ? ['AUTH', decodeURIComponent(endpoint.username), decodeURIComponent(endpoint.password)]
      : ['AUTH', decodeURIComponent(endpoint.password)]);
    const database = endpoint.pathname.slice(1);
    if (database && database !== '0') commands.push(['SELECT', database]);
    commands.push(args);
    const options = { host: endpoint.hostname, port: Number(endpoint.port || 6379) };
    const socket = endpoint.protocol === 'rediss:' ? connectTls(options) : createConnection(options);
    let buffer = Buffer.alloc(0);
    let completed = 0;
    const finish = (error?: Error, value?: unknown) => {
      socket.destroy();
      if (error) reject(error); else resolve(value);
    };
    socket.setTimeout(2000, () => finish(new Error('Redis command timed out')));
    socket.on('error', () => finish(new Error('Redis connection failed')));
    socket.on('end', () => { if (completed < commands.length) finish(new Error('Redis connection closed early')); });
    socket.once(endpoint.protocol === 'rediss:' ? 'secureConnect' : 'connect', () => {
      const chunks = commands.flatMap((command) => {
        const values = command.map((value) => Buffer.from(String(value)));
        return [Buffer.from(`*${values.length}\r\n`), ...values.flatMap((value) =>
          [Buffer.from(`$${value.length}\r\n`), value, Buffer.from('\r\n')])];
      });
      socket.write(Buffer.concat(chunks));
    });
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        while (completed < commands.length) {
          const parsed = parseReply(buffer, 0);
          if (!parsed) return;
          buffer = buffer.subarray(parsed.end);
          completed++;
          if (completed === commands.length) finish(undefined, parsed.value);
        }
      } catch (error) { finish(error instanceof Error ? error : new Error('Invalid Redis response')); }
    });
  });
/* step 3 initialization */
