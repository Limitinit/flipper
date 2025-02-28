/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export {FlipperServerImpl} from './FlipperServerImpl';
export {loadSettings} from './utils/settings';
export * from './tracker';
export {loadLauncherSettings} from './utils/launcherSettings';
export {loadProcessConfig} from './utils/processConfig';
export {getEnvironmentInfo} from './utils/environmentInfo';
export {getGatekeepers} from './gk';
export {setupPrefetcher} from './fb-stubs/Prefetcher';
export * from './server/attachSocketServer';
export * from './server/startFlipperServer';
export * from './server/startServer';
export * from './server/utilities';
export {isFBBuild} from './fb-stubs/constants';
export {initializeLogger} from './fb-stubs/Logger';

export {WEBSOCKET_MAX_MESSAGE_SIZE} from './app-connectivity/ServerWebSocket';

export {
  getAuthToken,
  hasAuthToken,
} from './app-connectivity/certificate-exchange/certificate-utils';

export {sessionId} from './sessionId';
import dns from 'dns';

// The default on node16 is to prefer ipv4 results which causes issues
// in some setups.
// @ts-ignore: Not in our node typings yet
dns.setDefaultResultOrder('verbatim');
