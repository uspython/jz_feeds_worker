const config = require('../worker/config');
const JZFeedWorker = require('../worker');
const logger = require('../worker/logger');
const { cityFrom, wait } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(cityName) {
  const theCity = cityFrom(cityName);
  const w = new JZFeedWorker(theCity, 'day');
  const r = await w.invoke();
  await wait(Math.round(Math.random() * 10 * 1000));
  logger.info(`[Weather] ${cityName}, ${r} added`);
}

async function start() {
  try {
    await connect();
    for (let index = 0; index < config.citys.length; index += 1) {
      const { cn } = config.citys[index];
      logger.info(`[Weather] start fetching...${cn}`);
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
