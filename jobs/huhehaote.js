const JZHuhehaoteWorker = require('../worker/region_worker');
const logger = require('../worker/logger');
const { wait, regionFrom } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(cityName) {
  await wait(Math.floor(Math.random() * 30 * 1000));

  const theRegion = regionFrom(cityName);

  logger.info(`[Weather] start fetching...${theRegion.province.name}, ${theRegion.city.name}, ${theRegion.country.name}`);
  const w = new JZHuhehaoteWorker(theRegion, 'day');
  const r = await w.invoke();
  logger.info(`[Weather] ${cityName}, ${r} added`);
}

async function start() {
  try {
    await connect();
    await doneWithCity('赛罕区');
    await disconnect();
  } catch (err) {
    logger.error({ err });
  }
}

start();
