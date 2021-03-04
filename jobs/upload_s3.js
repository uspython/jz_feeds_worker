const Publisher = require('../publisher');
const config = require('../worker/config');
const logger = require('../worker/logger');
const { cityFrom } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

const s3bucket = {
  name: config.bucketName,
};

async function doneWithCity(cityName) {
  const theCity = cityFrom(cityName, s3bucket);
  logger.info(`[UploadS3] start Publisher...${theCity.province}, ${theCity.name}`);
  let p = new Publisher(theCity);
  const r = await p.uploadJson();
  logger.info(`[UploadS3] ${cityName}, status ${r}`);

  p = null;
  return 0;
}

(async () => {
  try {
    await connect();

    for (let index = 0; index < config.weatherCitys.length; index += 1) {
      const { cn } = config.weatherCitys[index];
      // eslint-disable-next-line no-await-in-loop
      await doneWithCity(cn);
    }

    await disconnect();
    process.exit(0);
  } catch (err) {
    logger.error({ err });
  }
})();
