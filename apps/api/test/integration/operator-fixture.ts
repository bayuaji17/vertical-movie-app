import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { createAdminAuthServer } from '@repo/auth/server';
import { createApp } from '../../src/app';
import { applyDatabaseMigrations } from '../../src/db/migrate';
import * as schema from '../../src/db/schema';
import { resolve } from 'node:path';

const url = Bun.env.AUTH_ADMIN_TEST_DATABASE_URL;
if (!url) throw new Error('AUTH_ADMIN_TEST_DATABASE_URL is required.');
const parsed = new URL(url);
if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname) ||
    parsed.pathname !== '/vertical_movie_app_auth_admin_test') {
  throw new Error('Refusing to reset a database other than the dedicated local admin proof database.');
}
export const databaseUrl = url;
export const client = new SQL(url);
export const database = drizzle({ client, schema });
export const origin = 'http://localhost:3000';
export const config = { database, origin, secureCookies: false,
  secret: 'native-operator-proof-secret-never-use-outside-fixture' };
export const auth = createAdminAuthServer(config);
export const app = createApp({ auth });
export const apiDirectory = resolve(import.meta.dir, '../..');
export const childEnv = { ...Bun.env, DATABASE_URL: url,
  BETTER_AUTH_URL: origin, WEB_ORIGIN: origin, BETTER_AUTH_SECRET: config.secret };
export async function resetDatabase() {
  await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await client.unsafe('CREATE SCHEMA public');
  await client.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await applyDatabaseMigrations(url!);
}
export async function clearDatabase() {
  await database.delete(schema.session);
  await database.delete(schema.account);
  await database.delete(schema.user);
  await database.delete(schema.rateLimit);
  await database.delete(schema.verification);
}
export const password = 'native-admin-password-fixture-2026';
export function createAdmin(email: string) {
  return auth.api.createUser({ body: { email, name: 'Admin', password, role: 'admin' } });
}
export function signIn(email: string, value = password) {
  return app.handle(new Request(`${origin}/api/auth/sign-in/email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password: value }),
  }));
}
export function cookie(response: Response) {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}
export async function cli(args: string[], input: string) {
  const child = Bun.spawn([process.execPath, 'run', ...args], {
    cwd: apiDirectory, env: childEnv, stdin: new Blob([input+'\n']), stdout: 'pipe', stderr: 'pipe',
  });
  const [code, out, err] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  return { code, output: out+err };
}
