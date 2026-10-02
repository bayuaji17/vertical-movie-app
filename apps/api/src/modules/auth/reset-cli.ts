import { createAdminRecovery } from '@repo/auth/server';
import { loadApiEnv } from '../../config/env';
import { createDatabase } from '../../db/client';
import { readHiddenPassword } from './cli-input';

async function main() {
  const [email, confirmation, ...extra] = Bun.argv.slice(2);
  if (!email || confirmation !== '--maintenance-confirmed' || extra.length) {
    console.error('Usage: bun run --cwd apps/api admin:reset-password -- <admin-email> --maintenance-confirmed');
    console.error('Stop ALL API instances accepting login before confirming maintenance.');
    process.exitCode = 1;
    return;
  }
  let database: ReturnType<typeof createDatabase> | undefined;
  let password = '';
  try {
    const env = loadApiEnv();
    database = createDatabase(env.databaseUrl);
    password = await readHiddenPassword();
    const recovery = createAdminRecovery({
      database: database.db, origin: env.betterAuthUrl,
      secret: env.betterAuthSecret, secureCookies: env.betterAuthUrl.startsWith('https:'),
    });
    await recovery.reset({ email, password, maintenanceConfirmed: true });
    console.info('Admin password reset; all active sessions were revoked.');
  } catch {
    console.error('Admin recovery failed. Keep ALL API instances stopped; check the admin identity/schema and retry native recovery before restarting.');
    process.exitCode = 1;
  } finally {
    password = '';
    await database?.client.close();
  }
}
if (import.meta.main) await main();
