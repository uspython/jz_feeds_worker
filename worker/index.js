const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const config = require('./config');
const fetch = require('./fetch');
const logger = require('./logger');
const { connect, addOneFeed, queryCityFeeds } = require('./util/dbhelper');
const Feed = process.env.NODE_ENV === 'development'
  ? require('./models/mock_feed')
  : require('./models/feed');
const {
  cityEnNameFrom,
  callbackFromWeather,
  callWithRetry,
  provinceFrom,
} = require('./util/worker_helper');

dayjs.extend(customParseFormat);
const DateFormatString = 'YYYY-MM-DD';

class JZFeedWorker {
  constructor(aCity) {
    this.city = aCity;
  }

  async getNextDay() {
    const { id } = this.city;
    const cityId = id;

    if (!cityId) {
      return null;
    }

    let nextDay = '2020-03-01';
    const isExisted = await Feed.exists({ cityId });

    if (!isExisted) {
      // From 2020-03-01
    } else {
      const { releaseDate } = await Feed.findOne(
        { cityId },
        {},
        { sort: { createdAt: -1 } },
      );

      if (releaseDate) {
        const d = dayjs(releaseDate).add(1, 'day');
        nextDay = d.format(DateFormatString);
      }
    }

    return nextDay;
  }

  async getMonthRange() {
    const { id } = this.city;
    const cityId = id;

    if (!cityId) {
      return null;
    }

    let from = '2020-02-01';
    let to = '2020-02-01';
    const isExisted = await Feed.exists({ cityId });

    if (!isExisted) {
      // From 2020-02-01
      const fromDate = dayjs(from, DateFormatString);
      to = fromDate.endOf('month').format(DateFormatString);
    } else {
      const { releaseDate } = await Feed.findOne(
        { cityId },
        {},
        { sort: { createdAt: -1 } },
      );

      if (releaseDate) {
        const d = dayjs(releaseDate).add(1, 'day');
        from = d.format(DateFormatString);
        to = d.endOf('month').format(DateFormatString);
      }
    }

    return { from, to };
  }

  async fetchRawDataFromWeather(params) {
    // const url = `${config.weatherUrl}`;
    const { from = '', to = '' } = params;

    const weatherParams = {
      eletype: 1,
      city: cityEnNameFrom(this.city.name),
      start: from,
      end: to,
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
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);

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

    const feeds = rawData.map((d) => {
      const { addTime, num } = d;
      const addDate = dayjs(addTime);
      const feed = {
        cityId: this.city.id,
        region: {
          provinceId: provinceFrom(this.city).id,
          countryId: this.city.id,
        },
        releaseDate: addDate.startOf('day').valueOf(),
        pollenCount: `${num}`,
        forcastDate: addDate.add(1, 'day').startOf('day').valueOf(),
        forcastCount: '',
      };

      return feed;
    });

    return feeds;
  }
}

module.exports = JZFeedWorker;
