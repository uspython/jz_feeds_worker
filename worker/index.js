const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const config = require('./config');
const fetch = require('./fetch');
const logger = require('./logger');
const { connect, addFeed, queryCityFeeds } = require('./util/dbhelper');
const { cityMap } = require('./assets/city');
const Feed = require('./models/feed');

dayjs.extend(customParseFormat);

const DateFormatString = 'YYYY-MM-DD';
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

// function fetchFromWeather(params) {
//   // const url = `${config.weatherUrl}`;
//   const { from = '', to = '', city = '' } = params;

//   const weatherParams = {
//     eletype: 1,
//     city,
//     start: from,
//     end: to,
//   };

//   console.log(JSON.stringify(weatherParams));
//   // const apiPromise = fetch(
//   //   'GET',
//   //   url,
//   //   null,
//   //   weatherParams,
//   // );
// }

function cityFrom(cnName) {
  const citys = Object.values(cityMap)
    .reduce((p, c) => p.concat(c), [])
    .filter((c) => c.province.indexOf(cnName) > -1 || c.name.indexOf(cnName) > -1);

  if (citys.length !== 0) {
    return citys[0];
  }

  return null;
}

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

    return { nextDay };
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
}

module.exports.cityFrom = cityFrom;
module.exports.JZFeedWorker = JZFeedWorker;
