// Lets the ItFitS web app (another port) download product photos from this dev server when the
// TRY ON button hands a product over. Only asset responses get the CORS header.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previousEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/assets/')) res.setHeader('Access-Control-Allow-Origin', '*');
      return base(req, res, next);
    };
  },
};

module.exports = config;
