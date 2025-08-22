const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add fallbacks for Node.js modules in browser environment
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser.js"),
    "util": require.resolve("util"),
    "path": false,
    "fs": false,
    "os": false
  };

  // Add plugins to provide global variables
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
  ];

  // Ignore source map warnings for node_modules
  config.ignoreWarnings = [/Failed to parse source map/];

  // Fix React Refresh runtime import issues by allowing node_modules imports
  if (env === 'development') {
    // Allow imports from node_modules for React Refresh
    config.resolve.symlinks = false;
    
    // Update module rules to allow React Refresh runtime imports
    const oneOfRule = config.module.rules.find(rule => rule.oneOf);
    if (oneOfRule) {
      const tsRule = oneOfRule.oneOf.find(rule => 
        rule.test && rule.test.toString().includes('tsx?')
      );
      if (tsRule && tsRule.include) {
        // Allow React Refresh runtime to be processed
        tsRule.include = [tsRule.include, /node_modules[/\\]react-refresh/];
      }
    }
  }

  return config;
};
