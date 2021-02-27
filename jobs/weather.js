const config = require('../worker/config');
const JZFeedWorker = require('../worker');
const logger = require('../worker/logger');
const { cityFrom, wait, randomizeArray } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(cityName) {
  await wait(Math.floor(Math.random() * 30 * 1000));

  const theCity = cityFrom(cityName);
  logger.info(`[Weather] start fetching...${theCity.province}, ${theCity.name}`);
  const w = new JZFeedWorker(theCity, 'day');
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
  } catch (err) {
    logger.error({ err });
  } finally {
    disconnect();
  }
}

start();
