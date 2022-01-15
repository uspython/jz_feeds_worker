const config = require('../worker/config');
const JZFeedWorker = require('../worker/index');
const logger = require('../worker/logger');
const { regionFromWeather } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(cityName, weatherid) {
  const theRegion = regionFromWeather(cityName);

  logger.info(`[OpenWeatherAPI] start fetching...${theRegion.province.name}, ${theRegion.city.name}, ${theRegion.country.name}`);
  const w = new JZFeedWorker(theRegion, 'day');
  const r = await w.fetchWeatherFeedWith(weatherid);
  logger.info(`[OpenWeatherAPI] ${cityName}, ${r} added`);
}

async function start() {
  try {
    await connect();

    const randomCity = config.weatherCitys;

    for (let index = 0; index < randomCity.length; index += 1) {
      const { cn, weatherid } = randomCity[index];
      // eslint-disable-next-line no-await-in-loop
      await doneWithCity(cn, weatherid);
    }

    await disconnect();
  } catch (err) {
    logger.error({ err });
  }
}

start();
