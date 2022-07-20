const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  sourceType: "unambiguous", // 解决错误：ES Modules may not assign module.exports or exports.*, Use ESM export syntax
  // https://webpack.js.org/loaders/babel-loader/#exclude-libraries-that-should-not-be-transpiled
  // core-jswebpack/buildin如果它们被 Babel 转译，将导致错误
  exclude: [
    // \\ for Windows, \/ for Mac OS and Linux
    /node_modules[\\\/]core-js/,
    /node_modules[\\\/]webpack[\\\/]buildin/,
  ],
  presets: [
    [
      "@babel/preset-env",
      { useBuiltIns: "usage", corejs: 3, targets: "defaults" },
    ],
    "@babel/preset-react",
    "@babel/preset-typescript",
  ],
  plugins: [
    isDev && require.resolve('react-refresh/babel'), // 如果是开发模式,就启动react热更新插件
  ].filter(Boolean) // 过滤空值
};
