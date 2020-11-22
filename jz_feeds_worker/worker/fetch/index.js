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

  return axios(options);
};

module.exports = fetch;
