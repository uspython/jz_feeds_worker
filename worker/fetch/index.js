const axios = require('axios');

const fetch = (method, url, data, params, headers) => {
  if (!method) throw new Error('Method is a required field.');
  if (!url) throw new Error('Path is a required field.');

  const options = {
    method: method.toUpperCase(),
    url,
    data: data || {},
    params: params || {},
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.12(0x17000c30) NetType/WIFI Language/zh_CN',
      'Accept-Encoding': 'gzip;q=1.0, compress;q=0.5',
      'Content-Type': 'application/json',
      'Accept-Language': 'en;q=1.0',
      ...headers,
    },
  };

  /**
   * {
  // `data` is the response that was provided by the server
  data: {},

  // `status` is the HTTP status code from the server response
  status: 200,

  // `statusText` is the HTTP status message from the server response
  statusText: 'OK',

  // `headers` the HTTP headers that the server responded with
  // All header names are lower cased and can be accessed using the bracket notation.
  // Example: `response.headers['content-type']`
  headers: {},

  // `config` is the config that was provided to `axios` for the request
  config: {},

  // `request` is the request that generated this response
  // It is the last ClientRequest instance in node.js (in redirects)
  // and an XMLHttpRequest instance in the browser
  request: {}
}
   */
  return axios(options);
};

module.exports = fetch;
