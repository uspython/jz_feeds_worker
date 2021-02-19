const { cityMap } = require('../assets/city');
const { provinceObject } = require('../assets/province_object')

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

export function provinceFrom(city) {
  const { province } = city;

  const p = Object.values(provinceObject)
    .find(({name, id}) => name.indexOf(province) > -1);
  
  if(!p) return null;

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

function cityEnNameFrom(cnName) {
  const ret = config.citys.find(({ cn }) => cnName.indexOf(cn) > -1);

  if (!ret) {
    return '';
  }

  const { en } = ret;
  return en;
}

function callbackFromWeather(resp) {
  return "";
}


module.exports.cityFrom = cityFrom;
module.exports.cityEnNameFrom = cityEnNameFrom;
module.exports.callbackFromWeather = callbackFromWeather;
module.exports.callWithRetry = callWithRetry;