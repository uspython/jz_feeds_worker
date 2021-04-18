const config = require('../worker/config');
const JZFeedWorker = require('../worker/index');
const logger = require('../worker/logger');
const { wait, randomizeArray, regionFromWeather } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(cityName) {
  await wait(Math.floor(Math.random() * 30 * 1000));

  const theRegion = regionFromWeather(cityName);

  logger.info(`[Weather] start fetching...${theRegion.province.name}, ${theRegion.city.name}, ${theRegion.country.name}`);
  const w = new JZFeedWorker(theRegion, 'day');
  const r = await w.invoke();
  logger.info(`[Weather] ${cityName}, ${r} added`);
}

async function start() {
  try {
    await connect();

    const randomCity = randomizeArray(config.weatherCitys);

    for (let index = 0; index < randomCity.length; index += 1) {
      const { cn } = randomCity[index];
      // eslint-disable-next-line no-await-in-loop
      await doneWithCity(cn);
    }

    await disconnect();
  } catch (err) {
    logger.error({ err });
  }
}

start();
