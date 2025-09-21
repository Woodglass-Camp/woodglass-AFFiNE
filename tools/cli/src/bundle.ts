import { readFileSync,rmSync } from 'node:fs';
import { cpus } from 'node:os';

import { Logger } from '@affine-tools/utils/logger';
import { Package } from '@affine-tools/utils/workspace';
import { merge } from 'lodash-es';
import webpack from 'webpack';
import WebpackDevServer, {
  type Configuration as DevServerConfiguration,
} from 'webpack-dev-server';

import { Option, PackageCommand } from './command';
import {
  createHTMLTargetConfig,
  createNodeTargetConfig,
  createWorkerTargetConfig,
} from './webpack';

function getBaseWorkerConfigs(pkg: Package) {
  const core = new Package('@affine/core');

  return [
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join(
        'modules/workspace-engine/impls/workspace-profile.worker.ts'
      ).value
    ),
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join('modules/pdf/renderer/pdf.worker.ts').value
    ),
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join(
        'blocksuite/view-extensions/turbo-renderer/turbo-painter.worker.ts'
      ).value
    ),
  ];
}

function getBundleConfigs(pkg: Package) {
  switch (pkg.name) {
    case '@affine/admin': {
      return [createHTMLTargetConfig(pkg, pkg.srcPath.join('index.tsx').value)];
    }
    case '@affine/web':
    case '@affine/mobile':
    case '@affine/ios':
    case '@affine/android': {
      const workerConfigs = getBaseWorkerConfigs(pkg);
      workerConfigs.push(
        createWorkerTargetConfig(
          pkg,
          pkg.srcPath.join('nbstore.worker.ts').value
        )
      );

      return [
        createHTMLTargetConfig(
          pkg,
          pkg.srcPath.join('index.tsx').value,
          {},
          workerConfigs.map(config => config.name)
        ),
        ...workerConfigs,
      ];
    }
    case '@affine/electron-renderer': {
      const workerConfigs = getBaseWorkerConfigs(pkg);

      return [
        createHTMLTargetConfig(
          pkg,
          {
            index: pkg.srcPath.join('app/index.tsx').value,
            shell: pkg.srcPath.join('shell/index.tsx').value,
            popup: pkg.srcPath.join('popup/index.tsx').value,
            backgroundWorker: pkg.srcPath.join('background-worker/index.ts')
              .value,
          },
          {
            additionalEntryForSelfhost: false,
            injectGlobalErrorHandler: false,
            emitAssetsManifest: false,
          },
          workerConfigs.map(config => config.name)
        ),
        ...workerConfigs,
      ];
    }
    case '@affine/server': {
      return [createNodeTargetConfig(pkg, pkg.srcPath.join('index.ts').value)];
    }
  }

  throw new Error(`Unsupported package: ${pkg.name}`);
}

const IN_CI = !!process.env.CI;
const httpProxyMiddlewareLogLevel = IN_CI ? 'silent' : 'error';

const USE_HTTPS =
  process.env.DEV_HTTPS === 'true' || process.env.HTTPS === 'true';
const keyPath = process.env.SSL_KEY_FILE;
const certPath = process.env.SSL_CRT_FILE;

const defaultDevServerConfig: DevServerConfiguration = {
  host: '0.0.0.0',
  // Allow overriding dev server port by env; default 8080
  port: process.env.PORT ? Number(process.env.PORT) : 8080,
  server: USE_HTTPS
    ? {
        type: 'https',
        options:
          keyPath && certPath
            ? {
                key: readFileSync(keyPath),
                cert: readFileSync(certPath),
              }
            : undefined,
      }
    : 'http',
  allowedHosts: 'all',
  hot: false,
  liveReload: true,
  compress: !process.env.CI,
  setupExitSignals: true,
  client: {
    overlay: process.env.DISABLE_DEV_OVERLAY === 'true' ? false : undefined,
    logging: process.env.CI ? 'none' : 'error',
    // see: https://webpack.js.org/configuration/dev-server/#websocketurl
    // Respect WDS_SOCKET_PORT/PORT for HMR client to avoid port mismatches
    webSocketURL: `auto://${
      process.env.WDS_SOCKET_HOST ?? '0.0.0.0'
    }:${process.env.WDS_SOCKET_PORT ?? process.env.PORT ?? '8080'}/ws`,
  },
  historyApiFallback: {
    rewrites: [
      {
        from: /.*/,
        to: () => {
          return process.env.SELF_HOSTED === 'true'
            ? '/selfhost.html'
            : '/index.html';
        },
      },
    ],
  },
  proxy: [
    {
      context: '/api',
      target: 'http://localhost:3010',
      changeOrigin: true,
      onProxyReq: proxyReq => {
        try {
          proxyReq.setHeader('origin', 'http://localhost:3010');
          proxyReq.setHeader('referer', 'http://localhost:3010/');
        } catch {}
      },
      logLevel: httpProxyMiddlewareLogLevel,
    },
    {
      context: '/socket.io',
      target: 'http://localhost:3010',
      changeOrigin: true,
      ws: true,
      logLevel: httpProxyMiddlewareLogLevel,
    },
    {
      context: '/graphql',
      target: 'http://localhost:3010',
      changeOrigin: true,
      onProxyReq: proxyReq => {
        try {
          proxyReq.setHeader('origin', 'http://localhost:3010');
          proxyReq.setHeader('referer', 'http://localhost:3010/');
        } catch {}
      },
      logLevel: httpProxyMiddlewareLogLevel,
    },
  ],
};

export class BundleCommand extends PackageCommand {
  static override paths = [['bundle'], ['webpack'], ['pack'], ['bun']];

  // bundle is not able to run with deps
  override _deps = false;
  override waitDeps = false;

  dev = Option.Boolean('--dev,-d', false, {
    description: 'Run in Development mode',
  });

  async execute() {
    const pkg = this.workspace.getPackage(this.package);

    if (this.dev) {
      await BundleCommand.dev(pkg);
    } else {
      await BundleCommand.build(pkg);
    }
  }

  static async build(pkg: Package) {
    process.env.NODE_ENV = 'production';
    const logger = new Logger('bundle');
    logger.info(`Packing package ${pkg.name}...`);
    logger.info('Cleaning old output...');
    rmSync(pkg.distPath.value, { recursive: true, force: true });

    const config = getBundleConfigs(pkg);
    // @ts-expect-error allow
    config.parallelism = cpus().length;

    const compiler = webpack(config);

    compiler.run((error, stats) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      if (stats) {
        if (stats.hasErrors()) {
          console.error(stats.toString('errors-only'));
          process.exit(1);
        } else {
          console.log(stats.toString('minimal'));
        }
      }
    });
  }

  static async dev(pkg: Package, devServerConfig?: DevServerConfiguration) {
    process.env.NODE_ENV = 'development';
    const logger = new Logger('bundle');
    logger.info(`Starting dev server for ${pkg.name}...`);

    const config = getBundleConfigs(pkg);
    // @ts-expect-error allow
    config.parallelism = cpus().length;

    const compiler = webpack(config);

    const devServer = new WebpackDevServer(
      merge({}, defaultDevServerConfig, devServerConfig),
      compiler
    );

    await devServer.start();
  }
}
