/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  getLogger,
  getStringFromErrorLike,
  setLoggerInstance,
} from 'flipper-common';
import {init as initLogger} from './fb-stubs/Logger';
import {initializeRenderHost} from './initializeRenderHost';
import {createFlipperServer, FlipperServerState} from 'flipper-server-client';

const loadingContainer = document.getElementById('loading');
if (loadingContainer) {
  loadingContainer.innerText = 'Loading...';
}

let cachedFile: {name: string; data: string} | undefined;
let cachedDeepLinkURL: string | undefined;

const logger = initLogger();

async function start() {
  // @ts-ignore
  electronRequire = function (path: string) {
    console.error(
      `[decapitate] Tried to electronRequire ${path}, this module is not available in the browser and will be stubbed`,
    );
    return {
      default: {},
    };
  };

  setLoggerInstance(logger);

  const params = new URL(location.href).searchParams;

  const tokenProvider = async () => {
    const providerParams = new URL(location.href).searchParams;
    let token = providerParams.get('token');
    if (!token) {
      console.info(
        '[flipper-client][ui-browser] Get token from manifest instead',
      );
      try {
        const manifestResponse = await fetch('manifest.json');
        const manifest = await manifestResponse.json();
        token = manifest.token;
      } catch (e) {
        console.warn(
          '[flipper-client][ui-browser] Failed to get token from manifest. Error:',
          e.message,
        );
      }
    }

    getLogger().info(
      '[flipper-client][ui-browser] Token is available: ',
      token?.length != 0,
    );

    return token;
  };

  const openPlugin = params.get('open-plugin');
  if (openPlugin) {
    function removePrefix(input: string, prefix: string): string {
      const regex = new RegExp(`^${prefix}+`);
      return input.replace(regex, '');
    }

    const url = new URL(openPlugin);
    const maybeParams = removePrefix(url.pathname, '/');
    const params = new URLSearchParams(maybeParams);

    const deeplinkURL = new URL('flipper://open-plugin');
    deeplinkURL.search = params.toString();

    cachedDeepLinkURL = deeplinkURL.toString();
  }

  getLogger().info('[flipper-client][ui-browser] Create WS client');

  const flipperServer = await createFlipperServer(
    location.hostname,
    parseInt(location.port, 10),
    tokenProvider,
    (state: FlipperServerState) => {
      switch (state) {
        case FlipperServerState.CONNECTING:
          getLogger().info('[flipper-client] Connecting to server');
          window.flipperShowMessage?.('Connecting to server...');
          break;
        case FlipperServerState.CONNECTED:
          getLogger().info(
            '[flipper-client] Connection established with server',
          );
          window.flipperHideMessage?.();
          break;
        case FlipperServerState.DISCONNECTED:
          getLogger().info('[flipper-client] Disconnected from server');
          window.flipperShowMessage?.('Waiting for server...');
          break;
      }
    },
  );

  getLogger().info('[flipper-client][ui-browser] WS client connected');

  flipperServer.on('server-log', (logEntry) => {
    getLogger()[logEntry.type](
      `[${logEntry.namespace}] (${new Date(
        logEntry.time,
      ).toLocaleTimeString()}): ${logEntry.msg}`,
    );
  });

  getLogger().info(
    '[flipper-client][ui-browser] Waiting for server connection',
  );
  await flipperServer.connect();
  getLogger().info(
    '[flipper-client][ui-browser] Connected to server, get configuration',
  );
  const flipperServerConfig = await flipperServer.exec('get-config');

  getLogger().info(
    '[flipper-client][ui-browser] Configuration obtained, initialise render host',
  );

  initializeRenderHost(flipperServer, flipperServerConfig);
  initializePWA();

  // @ts-ignore
  // eslint-disable-next-line import/no-commonjs
  require('flipper-ui-core').startFlipperDesktop(flipperServer);
  window.flipperHideMessage?.();

  getLogger().info('[flipper-client][ui-browser] UI initialised');
  logger.track('success-rate', 'flipper-ui-browser-started', {value: 1});
}

start().catch((e) => {
  getLogger().error('Failed to start flipper-ui-browser', e);
  logger.track('success-rate', 'flipper-ui-browser-started', {
    value: 0,
    error: getStringFromErrorLike(e),
  });
  window.flipperShowMessage?.('Failed to start UI with error: ' + e);
});

async function initializePWA() {
  getLogger().info('[PWA] Initialization');

  let rehydrated = false;
  const openFileIfAny = () => {
    if (!cachedFile || !rehydrated) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('open-flipper-file', {
        detail: [cachedFile.name, cachedFile.data],
      }),
    );
    cachedFile = undefined;
  };

  const openURLIfAny = () => {
    if (!cachedDeepLinkURL || !rehydrated) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('flipper-protocol-handler', {
        detail: [cachedDeepLinkURL],
      }),
    );
    cachedDeepLinkURL = undefined;
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => {
        getLogger().info('[PWA] Service Worker has been registered');
      })
      .catch((e) => {
        getLogger().error('[PWA] failed to register Service Worker', e);
      });
  }

  if ('launchQueue' in window) {
    getLogger().debug('[PWA] File Handling API is supported');

    // @ts-ignore
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams || !launchParams.files) {
        return;
      }
      getLogger().debug('[PWA] Attempt to to open a file');
      for (const file of launchParams.files) {
        const blob = await file.getFile();
        blob.handle = file;

        const data = await blob.text();
        const name = file.name;

        cachedFile = {name, data};

        openFileIfAny();
      }
    });
  } else {
    console.warn('[PWA] File Handling API is not supported');
  }

  getLogger().debug('[PWA] Add before install prompt listener');
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt.
    e.preventDefault();
    // Stash the event so it can be triggered later.
    // @ts-ignore
    global.PWAppInstallationEvent = e;
    getLogger().info('[PWA] Installation event has been captured');
  });

  window.addEventListener('storeRehydrated', () => {
    getLogger().info('[PWA] Store is rehydrated');
    rehydrated = true;
    openFileIfAny();
    openURLIfAny();
  });
}
