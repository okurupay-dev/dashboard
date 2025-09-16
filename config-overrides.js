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

  // Fix React Refresh runtime import issues
  if (env === 'development') {
    // Disable React Fast Refresh to avoid import issues
    config.plugins = config.plugins.filter(
      plugin => plugin.constructor.name !== 'ReactRefreshPlugin'
    );
    
    // Remove React Refresh babel plugin
    const oneOfRule = config.module.rules.find(rule => rule.oneOf);
    if (oneOfRule) {
      oneOfRule.oneOf.forEach(rule => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach(use => {
            if (use.loader && use.loader.includes('babel-loader') && use.options && use.options.plugins) {
              use.options.plugins = use.options.plugins.filter(
                plugin => !plugin.toString().includes('react-refresh')
              );
            }
          });
        }
      });
    }
  }

  return config;
};
