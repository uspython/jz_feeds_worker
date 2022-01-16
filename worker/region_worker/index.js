const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const utc = require('dayjs/plugin/utc');
const config = require('../config');
const fetch = require('../fetch');
const logger = require('../logger');
const { Feed, alterFeed } = require('../util/dbhelper');

const {
  getCityCodeWith,
  callbackHuhehaote,
  WeatherDefaultDate,
  regionFromId,
} = require('../util/worker_helper');

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
const DateFormatString = 'YYYY-MM-DD';

const HuhehaoteCountry = { saihai: '150105000000', xincheng: '150102000000' };

class JZHuhehaoteWorker {
  /**
   * @param {aRegion} Region Object
   * @param {scheduleType} scheduleType 'day' | 'month'
   */
  constructor(scheduleType) {
    const e = {
      // 内蒙古呼和浩特赛罕区
      provinceId: '150000000000',
      cityId: '150100000000',
      countryId: '150105000000',
    };

    const region = regionFromId(e.provinceId, e.cityId, e.countryId);
    this.region = region;
    this.scheduleType = scheduleType || 'day';
  }

  async getNextDayRange() {
    const { city: { id }, province: { id: provinceId }, country: { id: countryId } } = this.region;
    const cityId = id;

    if (!cityId) {
      return null;
    }

    let nextDay = WeatherDefaultDate;
    const isExisted = await Feed.exists({ cityId, region: { provinceId, countryId } });

    if (!isExisted) {
      // From 2020-03-01
    } else {
      const { releaseDate } = await Feed.findOne(
        { cityId, region: { provinceId, countryId } },
        null,
        { sort: { releaseDate: -1 } },
      ).lean().exec();

      if (releaseDate) {
        const d = dayjs(releaseDate).add(1, 'day');
        nextDay = d.format(DateFormatString);
      }
    }

    return { from: nextDay, to: nextDay };
  }

  async fetchRawData() {
    // const url = `${config.weatherUrl}`;

    const { province, city, country } = this.region;
    const cityCode = getCityCodeWith(province.name + city.name + country.name);

    if (!cityCode || cityCode.length === 0) {
      throw new Error('City Code can not be Empty');
    }
    const requestParams = {};
    // TODO: (Jeff) Update specificRegions
    const { url } = config.specificRegions.find((r) => !!r.url);
    if (!url) {
      throw new Error('region url not found');
    }

    try {
      const { status, statusText, data } = await fetch(
        'GET',
        url,
        null,
        requestParams,
      );

      if (status === 200 || statusText === 'OK') {
        // eslint-disable-next-line max-len
        // dataList :[{
        //    "skDate" :"2021-04-02",
        //    "skSouth" :"68",
        //    "skNorth" :"21"
        // }, {
        //    "skDate" :"2021-04-03",
        //    "skSouth" :"45",
        //    "skNorth" :"35"
        // }]

        const dataList = callbackHuhehaote(data);
        return dataList || [];
      }
    } catch (error) {
      logger.error({ err: error });
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        // console.log(error.response.data);
        // console.log(error.response.status);
        // console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        // console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        // console.log('Error', error.message);
      }
      // console.log(error.config);

      return [];
    }
    return [];
  }

  feedsFrom(data) {
    const rawData = [...data];

    if (data.length === 0) {
      throw new Error('Weather Raw-Data Is Empty');
    }

    /**
     * [{
        //    "skDate" :"2021-04-02",
        //    "skSouth" :"68",
        //    "skNorth" :"21"
        // }]
     */

    const feeds = rawData
      .filter(({ skSouth, skNorth }) => (`${skSouth}`.trim().length > 0 || `${skNorth}`.trim().length > 0))
      .map((d) => {
        const { skDate, skSouth, skNorth } = d;
        const addDate = dayjs(skDate).startOf('day').add(8, 'hours'); // GMT+8 beijing
        // 赛罕区 feed
        const feedSaihan = {
          cityId: this.region.city.id,
          region: {
            provinceId: this.region.province.id,
            countryId: HuhehaoteCountry.saihai,
          },
          releaseDate: addDate.valueOf(),
          pollenCount: `${skSouth}`,
          forecastDate: addDate.add(1, 'day').valueOf(),
          forecastCount: '',
        };

        // 新城区 feed
        const feedXincheng = {
          cityId: this.region.city.id,
          region: {
            provinceId: this.region.province.id,
            countryId: HuhehaoteCountry.xincheng,
          },
          releaseDate: addDate.valueOf(),
          pollenCount: `${skNorth}`,
          forecastDate: addDate.add(1, 'day').valueOf(),
          forecastCount: '',
        };

        return [feedSaihan, feedXincheng];
      })
      .reduce((p, c) => p.concat(c), []);

    return feeds;
  }

  async invoke() {
    const dateRangePromise = this.getNextDayRange();
    const dateRange = await dateRangePromise;

    logger.info(`[Worker]: DateRange: ${dateRange.from} ${dateRange.to}`);
    // Guard Tomorrow
    const tomorrow = dayjs().add(1, 'day').startOf('day');
    if (dayjs(dateRange.to, DateFormatString).isSameOrAfter(tomorrow)) {
      logger.info('[Worker]: Wrong DateRange');
      return 0;
    }

    const rawData = await this.fetchRawData();
    const feeds = this.feedsFrom(rawData);

    // Guard feeds length
    if (feeds.length <= 0) {
      return 0;
    }

    const filteredFeeds = feeds.filter((f) => {
      if (dateRange.to === WeatherDefaultDate) {
        return true;
      }

      const today = dayjs().endOf('day');
      const releaseDate = dayjs(f.releaseDate).startOf('day');

      return releaseDate.isBefore(today);
    });

    let count = 0;
    if (this.scheduleType === 'day') {
      for (let idx = 0; idx < filteredFeeds.length; idx += 1) {
        const feed = filteredFeeds[idx];

        // eslint-disable-next-line no-await-in-loop
        count = await alterFeed(feed);
      }
    }

    logger.info(`\
[Worker]: Worker invoked, \
city: ${this.region.city.name} \
date: ${dateRange.from} ${dateRange.to} \
type: ${this.scheduleType} \
count: ${count}`);

    return count;
  }
}

module.exports = JZHuhehaoteWorker;
module.exports.HuhehaoteCountry = HuhehaoteCountry;
