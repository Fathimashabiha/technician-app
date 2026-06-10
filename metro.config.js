const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use 1 worker on Windows to avoid jest-worker SIGTERM / OOM during large bundles.
config.maxWorkers = 1;

module.exports = config;
