const config = require('../worker/config');
const JZMiniFluxWorker = require('../worker/miniflux/index');
const logger = require('../worker/logger');
const { wait, regionFromId } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function doneWithCity(region) {
  await wait(Math.floor(Math.random() * 30 * 1000));

  const theRegion = regionFromId(region.provinceId, region.cityId, region.countryId);

  logger.info(`[Get Feed From RSS] start fetching...${theRegion.province.name}, ${theRegion.city.name}, ${theRegion.country.name}`);
  const w = new JZMiniFluxWorker(theRegion, 'day');
  const r = await w.invoke();
  logger.info(`[Weather] ${theRegion.city.name}, ${r} added`);
}

async function start() {
  try {
    await connect();

    const { rssCities } = config;

    for (let index = 0; index < rssCities.length; index += 1) {
      const { region } = rssCities[index];
      // eslint-disable-next-line no-await-in-loop
      await doneWithCity(region);
    }

    await disconnect();
    process.exit(0);
  } catch (err) {
    logger.error({ err });
    process.exit(0);
  }
}

start();
