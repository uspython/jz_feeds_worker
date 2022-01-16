const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const utc = require('dayjs/plugin/utc');
const config = require('./config');
const fetch = require('./fetch');
const logger = require('./logger');
const {
  addManyFeeds, Feed, alterFeed,
  queryWeatherFeed, addWeatherFeed,
} = require('./util/dbhelper');

const {
  getCityCodeWith,
  callbackFromWeather,
  WeatherDefaultDate,
} = require('./util/worker_helper');

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
const DateFormatString = 'YYYY-MM-DD';

class JZFeedWorker {
  /**
   * @param {aRegion} Region Object
   * @param {scheduleType} scheduleType 'day' | 'month'
   */
  constructor(aRegion, scheduleType) {
    this.region = aRegion;
    this.scheduleType = scheduleType || 'day';
  }

  // TODO: (Jeff) Add provinceId/countryId Column to DB
  async getNextDayRange() {
    const {
      city: { id: cityId },
      province: { id: provinceId },
      country: { id: countryId },
    } = this.region;

    if (!cityId) {
      return null;
    }

    let nextDay = WeatherDefaultDate;
    const isExisted = await Feed.exists({
      cityId,
      region: { provinceId, countryId },
    });

    if (!isExisted) {
      // From 2020-03-01
    } else {
      const { releaseDate } = await Feed.findOne(
        {
          cityId,
          region: { provinceId, countryId },
        },
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

  async getMonthRange() {
    const { city: { id } } = this.region;
    const cityId = id;

    if (!cityId) {
      return null;
    }

    let from = WeatherDefaultDate;
    let to = from;
    const isExisted = await Feed.exists({ cityId });

    if (!isExisted) {
      // From 2020-03-01
      const fromDate = dayjs(from, DateFormatString);

      const today = dayjs().startOf('day');
      const endOfMonth = fromDate.endOf('month');

      to = endOfMonth.isAfter(today)
        ? today.format(DateFormatString)
        : endOfMonth.startOf('day').format(DateFormatString);
    } else {
      const { releaseDate } = await Feed.findOne(
        { cityId },
        {},
        { sort: { releaseDate: -1 } },
      ).lean().exec();

      if (releaseDate) {
        const d = dayjs(releaseDate).add(1, 'day');
        from = d.format(DateFormatString);
        const endOfMonth = d.endOf('month');
        to = endOfMonth.isAfter(dayjs().startOf('day'))
          ? from
          : endOfMonth.startOf('day').format(DateFormatString);
      }
    }

    return { from, to };
  }

  async fetchRawDataFromWeather(params) {
    // const url = `${config.weatherUrl}`;
    const { from = '', to = '' } = params;

    const { province, city, country } = this.region;
    const cityCode = getCityCodeWith(province.name + city.name + country.name);

    if (!cityCode || cityCode.length === 0) {
      throw new Error('City Code can not be Empty');
    }
    const weatherParams = {
      eletype: 1,
      city: cityCode,
      start: from,
      end: to,
      callback: 'callback',
    };
    try {
      const { status, statusText, data } = await fetch(
        'GET',
        config.weatherUrl,
        null,
        weatherParams,
      );

      if (status === 200 || statusText === 'OK') {
        // eslint-disable-next-line max-len
        // callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2020-03-01","city":"","level":"","cityCode":"beijing","num":"","eletype":"花粉","content":""}]})
        const { dataList } = callbackFromWeather(data);
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

  feedsFromWeatherRaw(data) {
    const rawData = [...data];

    if (data.length === 0) {
      throw new Error('Weather Raw-Data Is Empty');
    }

    /**
     * [{
     * "elenum":1,"week":"星期日",
     * "addTime":"2020-03-01",
     * "city":"",
     * "level":"",
     * "cityCode":"beijing",
     * "num":"",
     * "eletype":"花粉",
     * "content":""
     * }]
     */

    const feeds = rawData
      .filter(({ num }) => (`${num}`.trim().length > 0))
      .map((d) => {
        const { addTime, num } = d;
        const addDate = dayjs(addTime).startOf('day').add(8, 'hours'); // GMT+8 beijing
        const feed = {
          cityId: this.region.city.id,
          region: {
            provinceId: this.region.province.id,
            countryId: this.region.country.id,
          },
          releaseDate: addDate.valueOf(),
          pollenCount: `${num}`,
          forecastDate: addDate.add(1, 'day').valueOf(),
          forecastCount: '',
        };

        return feed;
      });

    return feeds;
  }

  async invoke() {
    const dateRangePromise = this.scheduleType === 'month'
      ? this.getMonthRange()
      : this.getNextDayRange();
    const dateRange = await dateRangePromise;

    logger.info(`[Worker]: DateRange: ${dateRange.from} ${dateRange.to}`);
    // Guard Tomorrow
    const tomorrow = dayjs().add(1, 'day').startOf('day');
    if (dayjs(dateRange.to, DateFormatString).isSameOrAfter(tomorrow)) {
      logger.info('[Worker]: Wrong DateRange');
      return 0;
    }
    const rawData = await this.fetchRawDataFromWeather(dateRange);
    const feeds = this.feedsFromWeatherRaw(rawData);

    // Guard feeds length
    if (feeds.length <= 0) {
      return 0;
    }

    let count = 0;
    if (this.scheduleType === 'day') {
      for (let idx = 0; idx < feeds.length; idx += 1) {
        const feed = feeds[idx];

        // eslint-disable-next-line no-await-in-loop
        count = await alterFeed(feed);
      }
    } else {
      count = await addManyFeeds(feeds);
    }

    logger.info(`\
[Worker]: Worker invoked, \
city: ${this.region.city.name}, ${this.region.country.name} \
date: ${dateRange.from} ${dateRange.to} \
type: ${this.scheduleType} \
count: ${count}`);

    return count;
  }

  async fetchWeatherFeedWith(weatherid) {
    const url = config.openWeatherApi;
    const requestParams = { id: weatherid, appid: config.openWeatherApiToken };

    const { status, statusText, data } = await fetch(
      'GET',
      url,
      null,
      requestParams,
    );

    if (status === 200 || statusText === 'OK') {
      const aWeatherFeed = data;

      if (!aWeatherFeed) {
        throw new Error('[fetchWeatherFeedWith] response data is Empty');
      }

      const results = await queryWeatherFeed({ id: weatherid });

      let ret = 0;
      if (!results || results.length === 0) {
        addWeatherFeed(aWeatherFeed);
        ret += 1;
      } else {
        const [{ id = 0, dt }] = results;

        if (id !== aWeatherFeed.id) {
          throw new Error('[fetchWeatherFeedWith] response wrone City');
        }

        // 超过半小时可以插入新数据
        if ((aWeatherFeed.dt - dt) > 1800) {
          addWeatherFeed(aWeatherFeed);
          ret += 1;
        }
      }

      logger.info(`\
[Worker]: Worker fetchWeatherFeedWith, \
city: ${this.region.city.name}, ${this.region.country.name} \
`);
      return ret;
    }

    return 0;
  }
}

module.exports = JZFeedWorker;
