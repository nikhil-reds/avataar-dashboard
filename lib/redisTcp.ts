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
/* step 1 initialization */
