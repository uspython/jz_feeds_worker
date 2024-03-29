/* eslint-disable no-cond-assign */
const { cityMap } = require('../assets/city');
const { countryMap } = require('../assets/county');
const { provinceObject } = require('../assets/province_object');
const config = require('../config');
const logger = require('../logger');
// const districts = require('../assets/district');
const coordinates = require('../assets/coordinate.json');

// Start Date
const WeatherDefaultDate = '2022-03-01';

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

  if (citys.length >= 1) {
    return citys[0];
  }

  return null;
}

function cityFromCityId(cityId) {
  const citys = Object.values(cityMap)
    .reduce((p, c) => p.concat(c), [])
    .filter((c) => c.id === cityId);

  if (citys.length >= 1) {
    return citys[0];
  }

  return null;
}

function cityFromCountryId(countryId) {
  let ret = null;

  for (let index = 0; index < Object.keys(countryMap).length; index += 1) {
    const cityId = Object.keys(countryMap)[index];

    const countries = countryMap[cityId];
    const isExisted = countries.findIndex((c) => (c.id === countryId)) > -1;

    if (isExisted) {
      ret = cityFromCityId(cityId);
      break;
    }
  }

  return ret;
}

function searchFromCountry(cnName) {
  const countries = Object.values(countryMap)
    .reduce((p, c) => p.concat(c), [])
    .filter((c) => c.city.indexOf(cnName) > -1 || c.name.indexOf(cnName) > -1);

  if (countries.length === 1) {
    return countries[0];
  }

  return null;
}

function countryFrom(city, countryId) {
  const countries = countryMap[city.id];

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

// function districtFrom(id) {
//   const region = districts.find(({ id: theId }) => (theId === id));
//   return region;
// }

function coordinateFrom(provinceName, cityName, countryName) {
  let countryArea = countryName;
  if (countryName === '市辖区') {
    countryArea = '';
  }
  /**
   * {
        "area": "",
        "city": "市辖区",
        "country": "中国",
        "lat": "39.910924547299565",
        "lng": "116.4133836971231",
        "province": "北京市"
    },
   */
  const { lat, lng } = coordinates
    .find(({ province, city, area }) => {
      const ret = province.indexOf(provinceName) > -1
        && city.indexOf(cityName) > -1
        && area.indexOf(countryArea) > -1;
      return ret;
    });
  return { lat, lng };
}

function regionFromWeather(cnName) {
  let city = cityFrom(cnName);
  let country = null;

  if (!city) {
    // Search from Country
    country = searchFromCountry(cnName);
    if (!country) return null;

    city = cityFromCountryId(country.id);
  }

  if (!city) {
    throw new Error(`Couldn't find city ${cnName}`);
  }

  const province = provinceFrom(city);

  let coord = null;
  if (!country) {
    country = city;
    coord = coordinateFrom(province.name, city.name, '');
  } else {
    coord = coordinateFrom(province.name, city.name, country.name);
  }

  return {
    city, province, country, coord,
  };
}

function regionFromId(provinceId, cityId, countryId) {
  const province = provinceObject[provinceId];

  const cities = cityMap[provinceId];

  if (!cities) {
    throw new Error(`can not find cities: ${province.name}`);
  }

  const city = cities.find((c) => c.id === cityId);
  let country = countryMap[cityId].find((c) => c.id === countryId);

  if (!province || !city) {
    throw new Error('can not find region');
  }

  let coord = null;
  if (!country) {
    country = city;
    coord = coordinateFrom(province.name, city.name, '');
  } else {
    coord = coordinateFrom(province.name, city.name, country.name);
  }

  return {
    province, city, country, coord,
  };
}

function aliasFromRegion(region) {
  const { province, city, country } = region;

  let fileName = '';
  if (city.id === country.id) {
    fileName = [province.pinyin, city.pinyin]
      .filter((i) => !!i)
      .join('_');
  } else {
    fileName = [province.pinyin, city.pinyin, country.pinyin]
      .filter((i) => !!i)
      .join('_');
  }

  return fileName;
}

function remoteConfigJson() {
  const weatherRegions = config.weatherCitys
    .map(({ cn }) => regionFromWeather(cn));
  const apiRegions = config.uploadCities
    .map(({ provinceId, cityId, countryId }) => regionFromId(provinceId, cityId, countryId));
  const rssRegions = config.rssCities
    // eslint-disable-next-line max-len
    .map(({ region: { provinceId, cityId, countryId } }) => regionFromId(provinceId, cityId, countryId));

  const regions = weatherRegions.concat(apiRegions).concat(rssRegions);
  return {
    success: true,
    message: '',
    data: {
      config: { regions },
    },
  };
}

function getCityCodeWith(cnName) {
  const ret = config.weatherCitys.find(({ cn }) => cnName.indexOf(cn) > -1);

  if (!ret) {
    return '';
  }

  const { code } = ret;
  return code;
}

// For weather api only
// eslint-disable-next-line max-len
// resp:callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2022-03-01","city":"","level":"","cityCode":"","num":"","eletype":"花粉","content":""}]})
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

// For weather api only
// eslint-disable-next-line max-len
// resp: https://miniflux.app/docs/api.html#endpoint-get-feed-entries
// eslint-disable-next-line max-len
// return [{"addTime":"2022-03-01","num":""}]
function callbackFromMinifluxApi(resp, regex) {
  let feedTitle = '';
  const ret = [];

  const { total = 0, entries = [] } = resp;

  if (total === 0) {
    throw new Error('no entries found');
  }

  for (let idx = 0; idx < entries.length; idx += 1) {
    const { content = '', published_at: publishedAt, feed: { title: theFeedTitle } } = entries[idx];
    feedTitle = theFeedTitle;
    const item = {};
    let m;
    while ((m = regex.exec(content)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        // eslint-disable-next-line no-param-reassign
        regex.lastIndex += 1;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        if (groupIndex === 1) {
          item.num = match;
          item.addTime = publishedAt;
          ret.push(item);
        }
      });
    }
  }
  console.log(`FeedTitle: ${feedTitle}, ${ret.length} matched.`);
  return ret;
}

// For weather api only
// eslint-disable-next-line max-len
// resp:[{
//    "skDate" :"2021-04-02",
//    "skSouth" :"68",
//    "skNorth" :"21"
// }, {
//    "skDate" :"2021-04-03",
//    "skSouth" :"45",
//    "skNorth" :"35"
// }]
function callbackHuhehaote(resp) {
  try {
    const ret = JSON.parse(`${resp}`);
    return ret;
  } catch (err) {
    return resp;
  }
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

function getRssFeedConfig(cnName) {
  for (let idx = 0; idx < config.rssCities.length; idx += 1) {
    const city = config.rssCities[idx];
    if (cnName.indexOf(city.feedName) > -1) {
      return city;
    }
  }

  return null;
}

module.exports.cityFrom = cityFrom;
module.exports.callWithRetry = callWithRetry;
module.exports.WeatherDefaultDate = WeatherDefaultDate;
module.exports.provinceFrom = provinceFrom;
module.exports.wait = wait;
module.exports.randomizeArray = randomizeArray;
module.exports.countryFrom = countryFrom;
module.exports.getCityCodeWith = getCityCodeWith;
module.exports.searchFromCountry = searchFromCountry;
module.exports.regionFromWeather = regionFromWeather;
module.exports.regionFromId = regionFromId;
module.exports.remoteConfigJson = remoteConfigJson;
module.exports.callbackFromWeather = callbackFromWeather;
module.exports.callbackFromMinifluxApi = callbackFromMinifluxApi;
module.exports.callbackHuhehaote = callbackHuhehaote;
module.exports.aliasFromRegion = aliasFromRegion;
module.exports.getRssFeedConfig = getRssFeedConfig;
