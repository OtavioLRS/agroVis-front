const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    'login': './src/js/login.js',
    'home': './src/js/home.js',
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].js'
  },
  devServer: {
    port: process.env.PORT || 3030,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      // publicPath: '/',
      chunks: ['login'],
      filename: 'index.html',
      template: 'src/index.html'
    }),
    new HtmlWebpackPlugin({
      // publicPath: '/home',
      chunks: ['home'],
      filename: 'home.html',
      template: 'src/home.html',
    }),
  ]
}