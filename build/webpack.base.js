const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  entry: resolve(__dirname, "../src/main.js"),
  output: {
    filename: "[name].[hash:8].js",
    path: resolve(__dirname, "../dist"),
    clean: true, // 打包前清空输出目录，相当于clean-webpack-plugin插件的作用,webpack5新增。
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        exclude: resolve(__dirname, "node_modules"),
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: ["autoprefixer"],
              },
            },
          },
        ],
      },
      {
        test: /\.m?js$/,
        exclude: resolve(__dirname, "node_modules"),
        use: "babel-loader",
      },
      // webpack5使用内置的asset-module来处理静态资源
      {
        test: /.(png|jpg|jpeg|gif|svg)$/,
        type: "asset", // type选择asset
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024,
          },
        },
        generator: {
          filename: "assets/images/[name].[hash:8][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, "../public/index.html"),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].[hash:8].css",
      chunkFilename: "[id].css",
    }),
  ],
};
