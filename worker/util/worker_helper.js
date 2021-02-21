const { cityMap } = require('../assets/city');
const { provinceObject } = require('../assets/province_object');
const config = require('../config');
const logger = require('../logger');

export const wait = (ms) => new Promise((res) => setTimeout(res, ms));

export const callWithRetry = async (fn, depth = 0) => {
  try {
    return await fn();
  } catch (e) {
    if (depth > 7) {
      throw e;
    }
    await wait(2 ** depth * 10);

    // eslint-disable-next-line no-unused-vars
    return callWithRetry(fn, depth + 1);
  }
};

export function cityFrom(cnName) {
  const citys = Object.values(cityMap)
    .reduce((p, c) => p.concat(c), [])
    .filter((c) => c.province.indexOf(cnName) > -1 || c.name.indexOf(cnName) > -1);

  if (citys.length !== 0) {
    return citys[0];
  }

  return null;
}

export function provinceFrom(city) {
  const { province } = city;

  const p = Object.values(provinceObject)
    .find(({ name }) => name.indexOf(province) > -1);

  if (!p) return null;

  return p;
}

export function cityCnNameFrom(enName) {
  const ret = config.citys.find(({ en }) => enName.indexOf(en) > -1);

  if (!ret) {
    return '';
  }

  const { cn } = ret;
  return cn;
}

export function cityEnNameFrom(cnName) {
  const ret = config.citys.find(({ cn }) => cnName.indexOf(cn) > -1);

  if (!ret) {
    return '';
  }

  const { en } = ret;
  return en;
}

// For weather api only
// eslint-disable-next-line max-len
// resp:callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2020-03-01","city":"","level":"","cityCode":"","num":"","eletype":"花粉","content":""}]})
export function callbackFromWeather(resp) {
  let jsonStr = '';
  const regex = /(?<=callback\()(.*)(?=\))/m;
  const m = regex.exec(resp);

  if (m !== null) {
    [jsonStr] = m;
  } else {
    logger.info(resp);
    throw new Error('Can not parse weather resp to JSON, match failure');
  }

  try {
    const ret = JSON.parse(jsonStr);
    return ret;
  } catch (err) {
    logger.error({ err });
  }

  return null;
}
