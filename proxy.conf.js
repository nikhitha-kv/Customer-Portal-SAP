const PROXY_CONFIG = {
  "/sap": {
    "target": "http://AZKTLDS5CP.kcloud.com:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "onProxyRes": function (proxyRes, req, res) {
      // Strip the WWW-Authenticate header if SAP returns 401.
      // This prevents the browser from showing the built-in credential popup.
      if (proxyRes.statusCode === 401 || proxyRes.headers['www-authenticate']) {
        delete proxyRes.headers['www-authenticate'];
      }
    }
  }
};

module.exports = PROXY_CONFIG;
