const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const envFile = path.resolve(process.argv[2] || 'apps/api/.env');
const output = path.resolve(process.argv[3] || `crm-scorecard-${Date.now()}.dump`);
const profile = String(process.argv[4] || 'normal').toLowerCase();
const values = {};
for (const rawLine of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const split = line.indexOf('=');
  if (split < 1) continue;
  const key = line.slice(0, split).trim();
  let value = line.slice(split + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values[key] = value;
}
let connection = values.DIRECT_URL || values.DATABASE_URL;
if (!connection) throw new Error('DIRECT_URL or DATABASE_URL is required');

if (profile === 'mizantra-test') {
  connection = connection
    .replace(/^postgesql:/, 'postgresql:')
    .replace('://postges:', '://postgres:')
    .replace(/nwkauz/g, 'nwkaruz')
    .replace('/postges?', '/postgres?');
  const url = new URL(connection);
  url.username = 'postgres.nwkaruzvzwwuftjquypk';
  url.hostname = 'aws-1-ap-southeast-1.pooler.supabase.com';
  url.port = '5432';
  connection = url.toString();
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const database = new URL(connection);
const pgEnvironment = {
  ...process.env,
  PGHOST: database.hostname,
  PGPORT: database.port || '5432',
  PGUSER: decodeURIComponent(database.username),
  PGPASSWORD: decodeURIComponent(database.password),
  PGDATABASE: database.pathname.replace(/^\//, '') || 'postgres',
  PGSSLMODE: 'require',
};
const outputDirectory = path.dirname(output);
const outputName = path.basename(output);
const live = profile === 'live';
const command = live ? 'sudo' : 'pg_dump';
const args = live ? [
  '--preserve-env=PGHOST,PGPORT,PGUSER,PGPASSWORD,PGDATABASE,PGSSLMODE',
  'docker', 'run', '--rm',
  '--user', '0:0',
  '--volume', `${outputDirectory}:/backup`,
  '--env', 'PGHOST', '--env', 'PGPORT', '--env', 'PGUSER', '--env', 'PGPASSWORD', '--env', 'PGDATABASE', '--env', 'PGSSLMODE',
  'postgres:17', 'pg_dump', '--format=custom', '--no-owner', '--no-acl', '--file', `/backup/${outputName}`,
] : ['--format=custom', '--no-owner', '--no-acl', '--file', output];
const result = spawnSync(command, args, { stdio: 'inherit', env: pgEnvironment });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const size = fs.statSync(output).size;
if (size < 1024) throw new Error('Database backup is unexpectedly small');
console.log(`Database backup created: ${output} (${size} bytes)`);
