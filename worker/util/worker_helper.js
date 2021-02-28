const { cityMap } = require('../assets/city');
const { countyMap } = require('../assets/county');
const { provinceObject } = require('../assets/province_object');
const config = require('../config');
const logger = require('../logger');

// Start Date
const WeatherDefaultDate = '2020-03-01';

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const callWithRetry = async (fn, depth = 0) => {
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

function cityFrom(cnName) {
  const citys = Object.values(cityMap)
    .reduce((p, c) => p.concat(c), [])
    .filter((c) => c.province.indexOf(cnName) > -1 || c.name.indexOf(cnName) > -1);

  if (citys.length !== 0) {
    return citys[0];
  }

  return null;
}

function countryFrom(city, countryId) {
  const countries = countyMap[city.id];

  if (!countries && countries.length === 0) {
    return null;
  }

  const r = countries.find(({ id }) => id === countryId);

  if (r) {
    return r;
  }

  return null;
}

function provinceFrom(city) {
  const { province } = city;

  const p = Object.values(provinceObject)
    .find(({ name }) => name.indexOf(province) > -1);

  if (!p) return null;

  return p;
}

function cityCnNameFrom(enName) {
  // eslint-disable-next-line max-len
  const ret = config.weatherCitys.find(({ en, code }) => enName.indexOf(en) > -1 || enName.indexOf(code) > -1);

  if (!ret) {
    return '';
  }

  const { cn } = ret;
  return cn;
}

function cityEnNameFrom(cnName) {
  const ret = config.weatherCitys.find(({ cn }) => cnName.indexOf(cn) > -1);

  if (!ret) {
    return '';
  }

  const { en } = ret;
  return en;
}

function cityCodeFrom(cnName) {
  const ret = config.weatherCitys.find(({ cn }) => cnName.indexOf(cn) > -1);

  if (!ret) {
    return '';
  }

  const { code } = ret;
  return code;
}

// For weather api only
// eslint-disable-next-line max-len
// resp:callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2020-03-01","city":"","level":"","cityCode":"","num":"","eletype":"花粉","content":""}]})
function callbackFromWeather(resp) {
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

function randomizeArray(original) {
  if (original.length === 0) {
    return [];
  }

  let ret = [...original];
  const a2 = [];

  while (ret.length !== 0) {
    const randomIndex = Math.floor(Math.random() * ret.length);
    a2.push(ret[randomIndex]);
    ret.splice(randomIndex, 1);
  }

  ret = a2;

  return ret;
}

module.exports.cityFrom = cityFrom;
module.exports.cityEnNameFrom = cityEnNameFrom;
module.exports.callbackFromWeather = callbackFromWeather;
module.exports.callWithRetry = callWithRetry;
module.exports.WeatherDefaultDate = WeatherDefaultDate;
module.exports.provinceFrom = provinceFrom;
module.exports.cityCnNameFrom = cityCnNameFrom;
module.exports.wait = wait;
module.exports.randomizeArray = randomizeArray;
module.exports.countryFrom = countryFrom;
module.exports.cityCodeFrom = cityCodeFrom;
