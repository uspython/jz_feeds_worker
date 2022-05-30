const Publisher = require('../publisher');
const config = require('../worker/config');
const logger = require('../worker/logger');
const {
  regionFromWeather, regionFromId, remoteConfigJson,
} = require('../worker/util/worker_helper');
const {
  connect, disconnect,
} = require('../worker/util/dbhelper');

const s3bucket = {
  name: config.bucketName,
};

async function upload(region) {
  const { province, city, country: { name: countryName = '' } = { name: '' } } = region;
  logger.info(`[UploadS3] start Publisher...${province.name}, ${city.name}, ${countryName || ''}`);
  let p = new Publisher(region, s3bucket);
  const jsonStatus = await p.uploadJson();
  logger.info(`[UploadS3] ${city.name} ${countryName.name}, status ${jsonStatus}`);
  p = null;

  let pb = new Publisher(region, s3bucket);
  const pbStatus = await pb.uploadProtoBuf();
  logger.info(`[UploadS3] ${city.name} ${countryName.name}, status ${pbStatus}`);
  pb = null;

  return 0;
}

// Upload Weather Cities' Pollen Json
async function doneWithWeather(cityName, weatherid) {
  const theRegion = regionFromWeather(cityName);
  theRegion.weatherid = weatherid;

  const ret = await upload(theRegion);
  return ret;
}

// Upload Specific API Pollen Data
async function doneWithAPI(apiConfigCities, weatherid) {
  let ret = 0;
  for (let index = 0; index < apiConfigCities.length; index += 1) {
    const { provinceId, cityId, countryId } = apiConfigCities[index];
    const region = regionFromId(provinceId, cityId, countryId);
    region.weatherid = weatherid;
    // eslint-disable-next-line no-await-in-loop
    const r = await upload(region);
    ret += r;
  }

  return ret;
}

// Upload Config Data Json
async function doneWithCityConfig() {
  const cityConfig = remoteConfigJson();
  const regionPlaceHolder = regionFromWeather('北京');
  let p = new Publisher(regionPlaceHolder, s3bucket);
  const jsonStatus = await p.uploadConfigJson(cityConfig);
  logger.info(`[UploadS3] config.json , status ${jsonStatus}`);
  p = null;

  let pb = new Publisher(regionPlaceHolder, s3bucket);
  const pbStatus = await pb.uploadConfigProtoBuf(cityConfig);
  logger.info(`[UploadS3] config.bytes , status , ${pbStatus}`);

  pb = null;
}

(async () => {
  try {
    await connect();

    logger.info('==========> Start upload json from weathers');
    for (let index = 0; index < config.weatherCitys.length; index += 1) {
      const { cn, weatherid } = config.weatherCitys[index];
      // 上传 Pollen Citys Config file 的数据
      // eslint-disable-next-line no-await-in-loop
      await doneWithWeather(cn, weatherid);
    }

    // 上传 特殊 API 的数据，如：呼和浩特市赛罕区
    logger.info('==========> Start upload json from api');
    const wid = 1529102; // 呼和浩特
    await doneWithAPI(config.uploadCities, wid);

    await disconnect();

    logger.info('==========> Start upload json from config cities');
    await doneWithCityConfig();
    process.exit(0);
  } catch (err) {
    logger.error({ err });
    process.exit(0);
  }
})();
