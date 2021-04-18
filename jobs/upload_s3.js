const Publisher = require('../publisher');
const config = require('../worker/config');
const logger = require('../worker/logger');
const {
  regionFromWeather, regionFromId, configCitiesJson,
} = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

const s3bucket = {
  name: config.bucketName,
};

async function upload(region) {
  const { province, city, country: { name: countryName = '' } = { name: '' } } = region;
  logger.info(`[UploadS3] start Publisher...${province.name}, ${city.name}, ${countryName || ''}`);
  let p = new Publisher(region, s3bucket);
  const r = await p.uploadJson();
  logger.info(`[UploadS3] ${city.name} ${countryName.name}, status ${r}`);

  p = null;
  return 0;
}

// Upload Weather Cities' Pollen Json
async function doneWithWeather(cityName) {
  const theRegion = regionFromWeather(cityName);

  const ret = await upload(theRegion);
  return ret;
}

// Upload Specific API Pollen Data
async function doneWithAPI(apiConfigCities) {
  let ret = 0;
  for (let index = 0; index < apiConfigCities.length; index += 1) {
    const { provinceId, cityId, countryId } = apiConfigCities[index];
    const region = regionFromId(provinceId, cityId, countryId);

    // eslint-disable-next-line no-await-in-loop
    const r = await upload(region);
    ret += r;
  }

  return ret;
}

// Upload Config Data Json
async function doneWithCityConfig() {
  const cityConfig = configCitiesJson();
  const regionPlaceHolder = regionFromWeather('北京');
  let p = new Publisher(regionPlaceHolder, s3bucket);
  const r = await p.uploadConfigJson(cityConfig);
  logger.info(`[UploadS3] config.json , status ${r}`);

  p = null;
}

(async () => {
  try {
    await connect();

    logger.info('==========> Start upload json from weathers');
    for (let index = 0; index < config.weatherCitys.length; index += 1) {
      const { cn } = config.weatherCitys[index];
      // eslint-disable-next-line no-await-in-loop
      await doneWithWeather(cn);
    }

    logger.info('==========> Start upload json from api');
    await doneWithAPI(config.uploadCities);

    await disconnect();

    logger.info('==========> Start upload json from config cities');
    await doneWithCityConfig();
    process.exit(0);
  } catch (err) {
    logger.error({ err });
  }
})();
