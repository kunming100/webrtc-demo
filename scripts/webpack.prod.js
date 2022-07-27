const { resolve } = require("path");
const { merge } = require("webpack-merge");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const baseConfig = require("./webpack.base.js");

module.exports = merge(baseConfig, {
  mode: "production",
  plugins: [
    // 抽离css
    new MiniCssExtractPlugin({
      filename: "./styles/[name].[hash:8].css",
      // chunkFilename: "[id].css",
    }),
    // 复制文件插件
    new CopyPlugin({
      patterns: [
        {
          from: resolve(__dirname, "../public"), // 复制public下文件
          to: resolve(__dirname, "../dist"), // 复制到dist目录中
          filter: (source) => {
            return !source.includes("index.html"); // 忽略index.html
          },
        },
      ],
    }),
  ],
});
