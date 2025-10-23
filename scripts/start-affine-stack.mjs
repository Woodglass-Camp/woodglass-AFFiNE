#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const defaultOptions = {
  dbHost: '127.0.0.1',
  dbPort: 5432,
  dbWait: true,
  dbReadyTimeoutMs: 120_000,
  serverHost: '127.0.0.1',
  serverPort: 3010,
  webPort: 8080,
  skipDb: false,
  keepDbOnExit: false,
  stackName: '',
  redisHost: '127.0.0.1',
  redisPort: 6379,
  mailhogSmtpPort: 1025,
  mailhogHttpPort: 8025,
  manticorePort: 9308,
  stages: ['db', 'server', 'web'],
};

function printUsage() {
  console.log(`Usage: node scripts/start-affine-stack.mjs [options]

Options:
  --db-host <host>          Hostname exposed for Postgres (default: 127.0.0.1)
  --db-port <port>          Host port for Postgres (default: 5432)
  --server-host <host>      Hostname for AFFiNE server (default: 127.0.0.1)
  --server-port <port>      Port for AFFiNE server (default: 3010)
  --web-port <port>         Port for AFFiNE web dev server (default: 8080)
  --stack-name <suffix>     Optional name suffix for docker compose project/volumes
  --redis-host <host>       Hostname for Redis (default: 127.0.0.1)
  --redis-port <port>       Host port for Redis (default: 6379)
  --mailhog-smtp-port <p>   Host SMTP port for Mailhog/Mailpit (default: 1025)
  --mailhog-http-port <p>   Host HTTP port for Mailhog/Mailpit UI (default: 8025)
  --manticore-port <port>   Host port for Manticore search (default: 9308)
  --stage <list>            Comma separated stages to run (db,server,web,clean-db,init-db). Default: db,server,web
  --skip-db                 Skip starting dockerized dev services
  --no-db-wait              Do not wait for database readiness after docker compose
  --db-ready-timeout <ms>   Override wait timeout (milliseconds) when checking the database port
  --keep-db                 Do not run 'docker compose down' on exit
  --help                    Show this help message

The script sequentially starts the dockerized dev database services, the
@affine/server workspace, and the @affine/web dev server. Ports can be
overridden per option without modifying existing configuration files.`);
}

const STACK_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function sanitizeStackName(value) {
  if (!value) return '';
  if (!STACK_NAME_PATTERN.test(value)) {
    throw new Error(
      `Invalid stack name '${value}'. Use alphanumeric characters, dot, dash or underscore, and do not start with punctuation.`
    );
  }
  if (value.length > 48) {
    throw new Error('Stack name is too long (max 48 characters).');
  }
  return value;
}

function parseArgs(argv) {
  const options = { ...defaultOptions };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--db-host':
        options.dbHost =
          argv[++i] ??
          (() => {
            throw new Error('Missing value for --db-host');
          })();
        break;
      case '--db-port':
        options.dbPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.dbPort)) {
          throw new Error('Invalid value for --db-port');
        }
        break;
      case '--server-host':
        options.serverHost =
          argv[++i] ??
          (() => {
            throw new Error('Missing value for --server-host');
          })();
        break;
      case '--server-port':
        options.serverPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.serverPort)) {
          throw new Error('Invalid value for --server-port');
        }
        break;
      case '--web-port':
        options.webPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.webPort)) {
          throw new Error('Invalid value for --web-port');
        }
        break;
      case '--redis-host':
        options.redisHost =
          argv[++i] ??
          (() => {
            throw new Error('Missing value for --redis-host');
          })();
        break;
      case '--redis-port':
        options.redisPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.redisPort)) {
          throw new Error('Invalid value for --redis-port');
        }
        break;
      case '--mailhog-smtp-port':
        options.mailhogSmtpPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.mailhogSmtpPort)) {
          throw new Error('Invalid value for --mailhog-smtp-port');
        }
        break;
      case '--mailhog-http-port':
        options.mailhogHttpPort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.mailhogHttpPort)) {
          throw new Error('Invalid value for --mailhog-http-port');
        }
        break;
      case '--manticore-port':
        options.manticorePort = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.manticorePort)) {
          throw new Error('Invalid value for --manticore-port');
        }
        break;
      case '--stack-name':
        options.stackName = sanitizeStackName(
          argv[++i] ??
            (() => {
              throw new Error('Missing value for --stack-name');
            })()
        );
        break;
      case '--stage': {
        const raw = argv[++i];
        if (!raw) {
          throw new Error('Missing value for --stage');
        }
        const items = raw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (items.length === 0) {
          throw new Error('Invalid value for --stage');
        }
        const valid = new Set(['db', 'server', 'web', 'clean-db', 'init-db']);
        items.forEach(stage => {
          if (!valid.has(stage)) {
            throw new Error(
              `Unknown stage '${stage}'. Expected one of db, server, web.`
            );
          }
        });
        options.stages = Array.from(new Set(items));
        break;
      }
      case '--skip-db':
        options.skipDb = true;
        break;
      case '--no-db-wait':
        options.dbWait = false;
        break;
      case '--db-ready-timeout':
        options.dbReadyTimeoutMs = parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(options.dbReadyTimeoutMs)) {
          throw new Error('Invalid value for --db-ready-timeout');
        }
        break;
      case '--keep-db':
        options.keepDbOnExit = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  return options;
}

function ensureDevComposeFiles() {
  const composeDir = path.join(repoRoot, '.docker', 'dev');
  const composeFile = path.join(composeDir, 'compose.yml');
  const composeExample = path.join(composeDir, 'compose.yml.example');
  const envFile = path.join(composeDir, '.env');
  const envExample = path.join(composeDir, '.env.example');

  if (!fs.existsSync(composeFile)) {
    if (!fs.existsSync(composeExample)) {
      throw new Error(`Missing docker compose template at ${composeExample}`);
    }
    fs.copyFileSync(composeExample, composeFile);
    console.log(`[setup] Copied ${composeExample} -> ${composeFile}`);
  }

  if (!fs.existsSync(envFile)) {
    if (!fs.existsSync(envExample)) {
      throw new Error(`Missing docker env template at ${envExample}`);
    }
    fs.copyFileSync(envExample, envFile);
    console.log(`[setup] Copied ${envExample} -> ${envFile}`);
  }

  return { composeDir, composeFile };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function runCommandCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'inherit'],
      ...options,
    });
    let stdout = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function startProcess(label, command, args, env, options = {}) {
  console.log(`[start] ${label}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    ...options,
  });

  child.on('exit', code => {
    console.log(`[${label}] exited with code ${code ?? 0}`);
  });

  return child;
}

async function ensureDatabaseInitialized(options, dbEnv) {
  const databaseUrl =
    process.env.DATABASE_URL ??
    `postgres://affine:affine@${options.dbHost}:${options.dbPort}/affine`;

  const env = {
    ...process.env,
    ...dbEnv,
    DATABASE_URL: databaseUrl,
    REDIS_SERVER_HOST: options.redisHost,
    REDIS_SERVER_PORT: String(options.redisPort),
  };

  const serverDir = path.join(repoRoot, 'packages', 'backend', 'server');

  console.log('[db:init] Applying Prisma migrations (prisma migrate dev)...');
  try {
    await runCommand('yarn', ['prisma', 'migrate', 'dev'], {
      cwd: serverDir,
      env,
    });
  } catch (err) {
    console.error('[db:init] Failed to apply Prisma migrations:', err.message);
    throw err;
  }

  console.log('[db:init] Running backend data migrations...');
  try {
    await runCommand(
      'yarn',
      ['affine', '@affine/server', 'data-migration', 'run'],
      {
        cwd: repoRoot,
        env,
      }
    );
  } catch (err) {
    console.error('[db:init] Failed to run data migrations:', err.message);
    throw err;
  }

  console.log('[db:init] Database initialization complete.');
}

function waitForPort(host, port, timeoutMs = 120000) {
  const start = Date.now();
  let lastLog = 0;

  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = net.createConnection({ host, port });
      socket.on('connect', () => {
        socket.end();
        resolve();
      });
      socket.on('error', err => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `Timed out waiting for ${host}:${port} to accept connections (${err.message})`
            )
          );
          return;
        }
        const now = Date.now();
        if (now - lastLog >= 5_000) {
          console.log(
            `[wait] Still waiting for ${host}:${port} to accept connections...`
          );
          lastLog = now;
        }
        setTimeout(check, 500);
      });
    };

    check();
  });
}

async function waitForService(label, child, host, port) {
  await Promise.race([
    waitForPort(host, port),
    (async () => {
      const [code] = await once(child, 'exit');
      throw new Error(`${label} exited prematurely with code ${code}`);
    })(),
  ]);
  console.log(`[ready] ${label} accepting connections on ${host}:${port}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const runDb = options.stages.includes('db');
  const runServer = options.stages.includes('server');
  const runWeb = options.stages.includes('web');
  const cleanDb = options.stages.includes('clean-db');
  const initDb = options.stages.includes('init-db');

  if (cleanDb && (runDb || runServer || runWeb || initDb)) {
    throw new Error("Stage 'clean-db' cannot be combined with other stages.");
  }
  if (initDb && (runDb || runServer || runWeb || cleanDb)) {
    throw new Error("Stage 'init-db' cannot be combined with other stages.");
  }

  const compose = runDb || cleanDb ? ensureDevComposeFiles() : null;

  const composeProjectBase = 'affine_dev_services';
  const composeProjectName =
    runDb || cleanDb
      ? options.stackName
        ? `${composeProjectBase}_${options.stackName}`
        : composeProjectBase
      : null;

  const dbEnv =
    runDb || cleanDb
      ? {
          AFFINE_DB_PORT: String(options.dbPort),
          COMPOSE_PROJECT_NAME: composeProjectName,
          AFFINE_REDIS_PORT: String(options.redisPort),
          AFFINE_MAILHOG_SMTP_PORT: String(options.mailhogSmtpPort),
          AFFINE_MAILHOG_HTTP_PORT: String(options.mailhogHttpPort),
          AFFINE_MANTICORE_PORT: String(options.manticorePort),
        }
      : {};

  const managedChildren = [];
  let keepAlive = null;

  if (cleanDb) {
    console.log('[db] Removing dockerized dev services...');
    await runCommand(
      'docker',
      ['compose', '-f', compose.composeFile, 'down', '-v'],
      {
        cwd: compose.composeDir,
        env: { ...process.env, ...dbEnv },
      }
    ).catch(err => {
      console.error(
        '[db] Failed to remove docker compose services:',
        err.message
      );
      process.exit(1);
    });
    console.log('[db] Docker services removed.');
    return;
  }

  if (initDb) {
    await ensureDatabaseInitialized(options, dbEnv);
    return;
  }

  if (runDb && !options.skipDb) {
    console.log('[db] Starting dockerized dev services...');
    await runCommand(
      'docker',
      ['compose', '-f', compose.composeFile, 'up', '-d'],
      {
        cwd: compose.composeDir,
        env: { ...process.env, ...dbEnv },
      }
    );

    try {
      const output = await runCommandCapture(
        'docker',
        ['compose', '-f', compose.composeFile, 'port', 'postgres', '5432'],
        {
          cwd: compose.composeDir,
          env: { ...process.env, ...dbEnv },
        }
      );
      const line = output.trim().split('\n').pop();
      if (line) {
        const match = line.match(/\[?([^\]]+)\]?:(\d+)/);
        if (match) {
          const [, publishedHost, publishedPort] = match;
          const mappedPort = Number(publishedPort);
          if (!Number.isNaN(mappedPort) && mappedPort !== options.dbPort) {
            console.warn(
              `[db] Requested host port ${options.dbPort}, but docker publishes ${mappedPort}. Using published port.`
            );
            options.dbPort = mappedPort;
          }
          if (publishedHost && publishedHost !== '0.0.0.0') {
            options.dbHost = publishedHost;
          }
        }
      }
    } catch (err) {
      console.warn(
        `[db] Unable to resolve published Postgres port automatically (${err.message}).`
      );
    }

    if (options.dbWait) {
      console.log(
        `[db] Waiting for Postgres at ${options.dbHost}:${options.dbPort}...`
      );
      await waitForPort(
        options.dbHost,
        options.dbPort,
        options.dbReadyTimeoutMs
      ).catch(err => {
        throw new Error(`Database did not become ready: ${err.message}`);
      });
      console.log(
        `[ready] Database available at ${options.dbHost}:${options.dbPort}`
      );
    } else {
      console.log('[db] Skipping database readiness wait');
    }
  } else if (runDb) {
    console.log('[db] Skipping docker compose start');
  }

  const databaseUrl =
    process.env.DATABASE_URL ??
    `postgres://affine:affine@${options.dbHost}:${options.dbPort}/affine`;

  let serverChild = null;
  if (runServer) {
    serverChild = startProcess(
      'server',
      'yarn',
      ['affine', 'dev', '-p', '@affine/server'],
      {
        AFFINE_SERVER_PORT: String(options.serverPort),
        AFFINE_SERVER_HOST: options.serverHost,
        AFFINE_SERVER_EXTERNAL_URL: `http://${options.serverHost}:${options.serverPort}`,
        DATABASE_URL: databaseUrl,
        REDIS_SERVER_HOST: options.redisHost,
        REDIS_SERVER_PORT: String(options.redisPort),
      }
    );
    managedChildren.push(serverChild);
    await waitForService(
      'server',
      serverChild,
      options.serverHost,
      options.serverPort
    );
  }

  let webChild = null;
  if (runWeb) {
    webChild = startProcess(
      'web',
      'yarn',
      ['affine', 'dev', '-p', '@affine/web'],
      {
        PORT: String(options.webPort),
        AFFINE_SERVER_PORT: String(options.serverPort),
        AFFINE_SERVER_HOST: options.serverHost,
        WDS_SHUTDOWN_MODE: 'force',
      }
    );
    managedChildren.push(webChild);
    await waitForService('web', webChild, '127.0.0.1', options.webPort);
  }

  const activeStages = [];
  if (runDb) activeStages.push('db');
  if (runServer) activeStages.push('server');
  if (runWeb) activeStages.push('web');
  console.log(
    `\n[ready] AFFiNE ${activeStages.join(', ')} stage(s) running. Press Ctrl+C to stop.\n`
  );

  const shutdown = async signal => {
    console.log(`\n[manager] Received ${signal}, shutting down...`);

    for (const child of managedChildren) {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    }

    for (const child of managedChildren) {
      try {
        await once(child, 'exit');
      } catch (err) {
        console.error('[manager] Error while waiting for process exit', err);
      }
    }

    if (runDb && !options.skipDb && !options.keepDbOnExit && compose) {
      console.log('[db] Stopping dockerized dev services...');
      try {
        await runCommand(
          'docker',
          ['compose', '-f', compose.composeFile, 'down'],
          {
            cwd: compose.composeDir,
            env: { ...process.env, ...dbEnv },
          }
        );
      } catch (err) {
        console.error('[db] Failed to stop docker compose:', err.message);
      }
    } else if (runDb && !options.skipDb) {
      console.log('[db] Leaving docker compose services running as requested');
    }

    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  if (managedChildren.length > 0) {
    await Promise.race(managedChildren.map(child => once(child, 'exit')));
    await shutdown('process termination');
  } else {
    // Keep process alive so Ctrl+C can trigger shutdown for DB-only mode
    keepAlive = setInterval(() => {}, 1 << 30);
    await new Promise(() => {});
  }
}

main().catch(err => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
