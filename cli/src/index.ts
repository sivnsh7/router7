#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';
import net from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

function getVersion(): string {
  try {
    const pkgPath = path.join(PKG_ROOT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (typeof pkg.version === 'string' && pkg.version.trim()) {
        return pkg.version.trim();
      }
    }
  } catch {
    // fallback if package.json read fails
  }
  return '0.8.1';
}

interface ServerOptions {
  port: number;
  explicitPort: boolean;
  host: string;
}

function printBanner(port: number, host: string) {
  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const url = `http://${displayHost}:${port}`;
  console.log(`
   ____             __             _____
  / __ \\____  __  __/ /____  _____/__  /
 / /_/ / __ \\/ / / / __/ _ \\/ ___/  / / 
/ _, _/ /_/ / /_/ / /_/  __/ /     / /  
/_/ |_|\\____/\\__,_/\\__/\\___/_/     /_/   

🌐 Router7 GUI Dashboard & AI Gateway (v${getVersion()})
──────────────────────────────────────────────────────────
  GUI Dashboard:    ${url}
  OpenAI Endpoint:  ${url}/v1
  Anthropic Wire:   ${url}/v1/messages
  Google Gemini:    ${url}/v1beta
──────────────────────────────────────────────────────────
`);
}

function printHelp() {
  console.log(`
Router7 GUI — Intelligent Multi-Provider AI Gateway & Web GUI Dashboard

Usage:
  r7 [options]
  router7 [options]

Options:
  -p, --port <number>   Port to listen on (default: 3001 or $PORT)
  -h, --host <string>   Host interface to bind to (default: 127.0.0.1 or $HOST)
  -v, --version         Show Router7 version
  --help                Show this help message

Examples:
  r7                    Start server & launch GUI dashboard on http://127.0.0.1:3001
  r7 --port 8080        Start server & launch GUI dashboard on port 8080
`);
}

function openBrowser(url: string) {
  const platform = process.platform;

  // Headless Linux check (Codespaces, SSH, Docker, VPS, cloud containers)
  if (platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return;
  }

  let cmd = '';
  let args: string[] = [];

  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  try {
    const cp = spawn(cmd, args, { stdio: 'ignore', detached: true });
    // Guard against unhandled error events when xdg-open/open is missing (e.g. ENOENT)
    cp.on('error', () => {
      // Non-blocking: silently ignore if no desktop browser is available
    });
    cp.unref();
  } catch {
    // Non-blocking: skip if spawn fails synchronously
  }
}

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host === '0.0.0.0' ? undefined : host);
  });
}

async function findAvailablePort(startPort: number, host: string): Promise<number> {
  let port = startPort;
  while (port < startPort + 50) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    port++;
  }
  return startPort;
}

function resolveServerEntry(): { serverPath: string; clientDistPath?: string } {
  // 1. Check monorepo path
  const monorepoServerDist = path.resolve(PKG_ROOT, '../server/dist/index.js');
  const monorepoClientDist = path.resolve(PKG_ROOT, '../client/dist');
  if (fs.existsSync(monorepoServerDist)) {
    return {
      serverPath: monorepoServerDist,
      clientDistPath: fs.existsSync(monorepoClientDist) ? monorepoClientDist : undefined,
    };
  }

  // 2. Check standalone bundled distribution
  const bundledServer = path.resolve(PKG_ROOT, 'server-dist/index.js');
  const bundledClient = path.resolve(PKG_ROOT, 'client-dist');
  if (fs.existsSync(bundledServer)) {
    return {
      serverPath: bundledServer,
      clientDistPath: fs.existsSync(bundledClient) ? bundledClient : undefined,
    };
  }

  // 3. Fallback: try relative from cwd
  const cwdServer = path.resolve(process.cwd(), 'server/dist/index.js');
  if (fs.existsSync(cwdServer)) {
    return {
      serverPath: cwdServer,
      clientDistPath: path.resolve(process.cwd(), 'client/dist'),
    };
  }

  throw new Error(
    'Could not locate Router7 server build. Run "npm run build" in the repository first.',
  );
}

function waitForReady(host: string, port: number, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  const probeHost = host === '0.0.0.0' ? '127.0.0.1' : host;

  return new Promise((resolve) => {
    function probe() {
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }

      const req = http.get(`http://${probeHost}:${port}/api/ping`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          setTimeout(probe, 150);
        }
      });

      req.on('error', () => {
        setTimeout(probe, 150);
      });
      req.setTimeout(500, () => {
        req.destroy();
        setTimeout(probe, 150);
      });
    }

    probe();
  });
}

function parseArgs(argv: string[]): ServerOptions {
  let explicitPort = false;
  let port = 3001;
  if (process.env.PORT) {
    const envP = Number(process.env.PORT);
    if (Number.isInteger(envP) && envP > 0 && envP < 65536) {
      port = envP;
      explicitPort = true;
    }
  }
  let host = process.env.HOST || '127.0.0.1';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
    if (arg === '-v' || arg === '--version') {
      console.log(`router7 v${getVersion()}`);
      process.exit(0);
    }
    if (arg === '--no-open') {
      console.log('Notice: Headless CLI mode has been removed. Router7 runs exclusively as a GUI application.');
      continue;
    }
    if (arg === '-p' || arg === '--port') {
      const val = Number(argv[++i]);
      if (Number.isInteger(val) && val > 0 && val < 65536) {
        port = val;
        explicitPort = true;
      } else {
        console.error(`Invalid port: ${argv[i]}`);
        process.exit(1);
      }
      continue;
    }
    if (arg === '-h' || arg === '--host') {
      host = argv[++i] || '127.0.0.1';
      continue;
    }
  }

  return { port, explicitPort, host };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { serverPath, clientDistPath } = resolveServerEntry();

  let targetPort = options.port;
  if (!options.explicitPort) {
    targetPort = await findAvailablePort(options.port, options.host);
    if (targetPort !== options.port) {
      console.log(`Port ${options.port} is in use; automatically selected port ${targetPort}.`);
    }
  }

  printBanner(targetPort, options.host);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(targetPort),
    HOST: options.host,
  };

  if (clientDistPath) {
    env.CLIENT_DIST = clientDistPath;
  }

  let child: ChildProcess | null = null;

  try {
    child = spawn(process.execPath, [serverPath], {
      env,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('Failed to start Router7 server:', err);
    process.exit(1);
  }

  const cleanup = () => {
    if (child && !child.killed) {
      child.kill('SIGINT');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  child.on('error', (err) => {
    console.error('Router7 server process error:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  // Once server is ready, launch Router7 GUI Dashboard in browser
  const ready = await waitForReady(options.host, targetPort);
  if (ready) {
    const displayHost = options.host === '0.0.0.0' ? '127.0.0.1' : options.host;
    const targetUrl = `http://${displayHost}:${targetPort}`;
    if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      console.log(`🚀 Router7 GUI Dashboard active at ${targetUrl}\n`);
    } else {
      console.log(`🚀 Launching Router7 GUI Dashboard at ${targetUrl}...\n`);
      openBrowser(targetUrl);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
