const
  dayjs = require('dayjs'),
  customParseFormat = require('dayjs/plugin/customParseFormat'),
  config = require('./config'),
  fetch = require('./fetch'),
  logger = require('./logger'),
  { connect, addFeed, queryCityFeeds } = require('./util/dbhelper'),
  cityAssets = require('./assets/city'),
  Feed = require('./models/feed');

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

function fetchFromWeather(params) {
  // const url = `${config.weatherUrl}`;
  const { from = '', to = '', city = '' } = params;

  const weatherParams = {
    eletype: 1,
    city,
    start: from,
    end: to,
  };

  console.log(JSON.stringify(weatherParams));
  // const apiPromise = fetch(
  //   'GET',
  //   url,
  //   null,
  //   weatherParams,
  // );
}

class JZFeedWorker {
  constructor(cityEnName) {
    this.cityEnName = cityEnName;
  }

  getCityId() {
    const citys = Object.values(cityAssets)
      .reduce((p, c) => c.concat(p), [])
      .filter((c) => c.province.indexOf(this.cityEnName) || c.name.indexOf(this.cityEnName));

    if (citys.length !== 0) {
      return citys[0].id;
    }

    return null;
  }

  async fetchMonth() {
    const cityId = this.getCityId();

    if (cityId) {
      return;
    }

    let
      from = '2020-02-01',
      to = '2020-02-01';
    if (!Feed.exists({ cityId })) {
      // From 2020-02-01
      const fromDate = dayjs(from, DateFormatString);
      to = fromDate.endOf('month').format(DateFormatString);
    } else {
      const { releaseDate } = await Feed.findOne(
        { cityId },
        {},
        { sort: { 'createdAt': -1 } }
      );

      if (!!releaseDate) {
        const d = dayjs(releaseDate).add(1, 'day');
        from = d.format(DateFormatString);
        to = d.endOf('month').format(DateFormatString);
      }


      await wait(1);

      console.log(`${from}, ${to}`);
    };
  }
}
}

module.exports = fetchFromWeather;
