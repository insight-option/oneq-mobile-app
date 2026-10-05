// Metro config: keep the file map / watcher off the folders that are not part of the app bundle.
// `.amplify/` (CDK synth output, hundreds of MB), the native build output and the Node-only scripts
// otherwise get crawled and watched on every start, which is very slow on Windows (no Watchman: Metro
// falls back to walking every directory). The patterns match the directory itself and everything
// below it, in both Windows and POSIX spellings, because metro-file-map tests directories as well as
// files (otherwise the walker still descends into them).
/* eslint-env node */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SEP = '[\\\\/]';
const escapeSegment = (segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rootPattern = __dirname.split(/[\\/]/).map(escapeSegment).join(SEP);
const excluded = ['.amplify', 'android', 'ios', 'scripts', 'docs', '.expo'];
const blocked = excluded.map((dir) => new RegExp(`^${rootPattern}${SEP}${escapeSegment(dir)}(${SEP}.*)?$`));

const existing = Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : [];
config.resolver.blockList = [...existing, ...blocked];

module.exports = config;
