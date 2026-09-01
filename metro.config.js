const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'src/lib/empty-stream.js');
const emptyWs = path.resolve(__dirname, 'src/lib/empty-ws.js');

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

const nodeShims = new Set([
  'stream',
  'zlib',
  'http',
  'https',
  'net',
  'tls',
  'crypto',
  'fs',
  'path',
  'bufferUtil',
  'utf-8-validate',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws' || moduleName.startsWith('ws/')) {
    return {
      filePath: emptyWs,
      type: 'sourceFile',
    };
  }
  if (nodeShims.has(moduleName)) {
    return {
      filePath: emptyModule,
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
