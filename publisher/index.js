const AWS = require('aws-sdk');
const {
  S3Client, ListBucketsCommand, PutObjectCommand,
} = require('@aws-sdk/client-s3');
const dayjs = require('dayjs');
const pako = require('pako');
const fs = require('fs');
const _ = require('lodash');
const crypto = require('crypto');
const config = require('../worker/config');
const Feed = require('../worker/models/feed');
const WeatherFeed = require('../worker/models/weather_feed');
const logger = require('../worker/logger');
const { aliasFromRegion } = require('../worker/util/worker_helper');
const {
  pollenToProtoBuf, decodePollenProtoBuf, configToProtoBuf, decodeConfigProtoBuf,
} = require('../protobuf');

const { algorithm, key, iv } = config;

function encrypt(data) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { encryptedData: encrypted };
}

function decrypt(data) {
  const { encryptedData } = data;
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
const myConfig = new AWS.Config({
  credentials,
  region: config.awsRegion,
});
AWS.config.update(myConfig);

const ExcludeFields = {
  __v: 0,
  _id: 0,
  createdAt: 0,
  cityId: 0,
  pollenCount: 0,
};

class Publisher {
  /**
   * @param {aRegion} Region Object
   * @param {bucket} bucket s3 bucket
   */
  constructor(aRegion, bucket) {
    this.bucket = bucket || { name: config.bucketName };

    this.region = aRegion;

    this.region.alias = aliasFromRegion(aRegion);
    // Create S3 service object
    this.s3 = new S3Client({ region: config.awsRegion });
  }

  async listBuckets() {
    const { Buckets = [] } = await this.s3.send(new ListBucketsCommand({}));
    return Buckets;
  }

  // Helper methods for data fetching
  async fetchLatest7DaysData(regionParams) {
    return Feed.find(
      {
        cityId: this.region.city.id,
        releaseDate: { $gte: dayjs().add(-6, 'day').startOf('day').add(8, 'hours') },
        ...regionParams,
      },
      null,
      { sort: { releaseDate: -1 } }
    )
      .select(ExcludeFields)
      .lean()
      .exec();
  }

  async fetchLastMonthData(regionParams) {
    return Feed.find(
      {
        cityId: this.region.city.id,
        releaseDate: { $gte: dayjs().add(-1, 'month').startOf('day').add(8, 'hours') },
        ...regionParams,
      },
      null,
      { sort: { releaseDate: 1 } }
    )
      .select(ExcludeFields)
      .lean()
      .exec();
  }

  async fetchOneYearAgoData(regionParams) {
    return Feed.find(
      {
        cityId: this.region.city.id,
        releaseDate: {
          $gte: dayjs().subtract(1, 'year').subtract(1, 'month').startOf('day').add(8, 'hours'),
          $lte: dayjs().subtract(1, 'year').startOf('day').add(8, 'hours')
        },
        ...regionParams,
      },
      null,
      { sort: { releaseDate: 1 } }
    )
      .select(ExcludeFields)
      .lean()
      .exec();
  }

  async fetchWeatherData() {
    return WeatherFeed.find(
      {
        id: this.region.weatherid,
        dt: { $gte: dayjs().add(-12, 'hours').unix() },
      },
      null,
      { sort: { dt: -1 } }
    )
      .select({
        __v: 0,
        _id: 0,
        createdAt: 0,
        updateAt: 0,
      })
      .lean()
      .exec();
  }

  // Helper method for processing data
  processDateValues(results) {
    return results.map(item => 
      _.mapValues(item, v => v instanceof Date ? v.toISOString() : v)
    );
  }

  async getRawJson() {
    const regionParams = this.region.country.id === this.region.city.id
      ? {}
      : { 'region.countryId': this.region.country.id };

    // Fetch all data in parallel
    const [pollenResults, openWeatherResults] = await Promise.all([
      this.fetchLatest7DaysData(regionParams),
      this.fetchWeatherData()
    ]);

    // Process results using the shared helper method
    return {
      pollenResults: this.processDateValues(pollenResults),
      openWeatherResults: this.processDateValues(openWeatherResults)
    };
  }

  // get the latest 7 days data field
  // add the latest 1 months data field
  async getRawJsonV2() {
    const regionParams = this.region.country.id === this.region.city.id
      ? {}
      : { 'region.countryId': this.region.country.id };

    // Fetch all data in parallel
    const [
      latest7DaysPollenResults,
      latestMonthPollenResults,
      oneYearAgoFromTodayPollenResults,
      openWeatherResults
    ] = await Promise.all([
      this.fetchLatest7DaysData(regionParams),
      this.fetchLastMonthData(regionParams),
      this.fetchOneYearAgoData(regionParams),
      this.fetchWeatherData()
    ]);

    // Process all results
    return {
      pollenResults: this.processDateValues(latest7DaysPollenResults),
      openWeatherResults: this.processDateValues(openWeatherResults),
      latestMonthPollenResults: this.processDateValues(latestMonthPollenResults),
      oneYearAgoFromTodayPollenResults: this.processDateValues(oneYearAgoFromTodayPollenResults),
    };
  }

  async getMockRawJson() {
    const regionParams = this.region.country.id === this.region.city.id
      ? {}
      : { 'region.countryId': this.region.country.id };

    // Add a new helper method for mock data fetching
    async function fetchMockPollenData() {
      return Feed.find(
        {
          cityId: this.region.city.id,
          createdAt: { $gte: dayjs().add(-1, 'month').startOf('day').add(8, 'hours') },
          ...regionParams,
        },
        null,
        { sort: { releaseDate: -1 } }
      )
        .select(ExcludeFields)
        .limit(10)
        .lean()
        .exec();
    }

    // Fetch all data in parallel
    const [pollenResults, openWeatherResults] = await Promise.all([
      fetchMockPollenData.call(this),
      this.fetchWeatherData()
    ]);

    // Process results using the shared helper method
    return {
      pollenResults: this.processDateValues(pollenResults),
      openWeatherResults: this.processDateValues(openWeatherResults)
    };
  }

  /**
* format to:
* {
  "success": boolean,
  "message": "error message",
  "data": { }
}
*/
  mapToApiFromJson(json) {
    const { pollenResults = [], openWeatherResults = [] } = json;
    const groupByRegion = _.groupBy(pollenResults, 'region.countryId');
    const theRegion = this.region;

    const pollenData = Object.keys(groupByRegion)
      .map((countryId) => {
        const latest = groupByRegion[countryId];
        const [latestWeather = null] = openWeatherResults;
        return {
          latest,
          latestWeather,
          region: theRegion,
        };
      });

    return {
      success: true,
      message: '',
      data: {
        pollen_data: pollenData,
      },
    };
  }

  // Make Sure data key is in camelcase
  mapToApiFromJsonV2(json) {
    const { 
      pollenResults = [], 
      openWeatherResults = [], 
      latestMonthPollenResults = [], 
      oneYearAgoFromTodayPollenResults = [] 
    } = json;
    const groupByRegion = _.groupBy(pollenResults, 'region.countryId');
    const latestMonthGroupByRegion = _.groupBy(latestMonthPollenResults, 'region.countryId');
    const oneYearAgoFromTodayGroupByRegion = _.groupBy(oneYearAgoFromTodayPollenResults, 'region.countryId');
    const theRegion = this.region;

    const pollenData = Object.keys(groupByRegion)
      .map((countryId) => {
        const latest = groupByRegion[countryId];
        const latest1Month = latestMonthGroupByRegion[countryId];
        const oneYearAgoFromToday = oneYearAgoFromTodayGroupByRegion[countryId];
        const [latestWeather = null] = openWeatherResults;

        return {
          latest,
          latestWeather,
          region: theRegion,
          history: {
            lastMonth: latest1Month,
            oneYearAgo: oneYearAgoFromToday,
          }
        };
      });

    return {
      success: true,
      message: '',
      data: {
        pollenData,
      },
    };
  }

  async archiveFileFrom(utf8ArrayData) {
    // Uint8Array
    const data = utf8ArrayData;

    const archiveDir = `../archives/${dayjs().add(8, 'hours').format('YYYY-MM-DD-HH')}`;

    fs.access(archiveDir, (err) => {
      if (err) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      fs.writeFile(`${archiveDir}/${this.region.alias}${config.fileKeyNameSurfix}.gz`, data, (e) => {
        if (!e) {
          logger.info(`archive ${this.region.alias} successfully`);
        }
      });
    });
  }

  async uploadJson() {
    const { pollenResults = [], openWeatherResults = [] } = await this.getRawJson();

    if (pollenResults.length === 0) {
      logger.info(`${this.region.city.name} have not content in last 7 days.`);
      return 0;
    }

    const str = JSON.stringify(this.mapToApiFromJson({ pollenResults, openWeatherResults }));

    if (process.env.NODE_ENV === 'development') {
      console.log(str);
    }

    const buffer = Buffer.from(str, 'utf8');
    const bodyJsonGz = pako.gzip(buffer);
    const fileName = `${this.region.alias}${config.fileKeyNameSurfix}`;

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: bodyJsonGz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      // Cache 1h
      CacheControl: 'no-cache=Set-Cookie,max-age=3600',
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload json success: ${this.region.province.name}, ${this.region.city.name}, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }

  async uploadProtoBuf() {
    const { pollenResults = [], openWeatherResults = [], latestMonthPollenResults = [] } = await this.getRawJsonV2();

    if (pollenResults.length === 0) {
      logger.info(`${this.region.city.name} have not content in last 7 days.`);
      return 0;
    }

    const doc = this.mapToApiFromJsonV2({ pollenResults, openWeatherResults, latestMonthPollenResults });
    const buffer = await pollenToProtoBuf(doc);
    const gziped = pako.gzip(buffer);
    // Encrypt bytes using AES
    const { encryptedData } = encrypt(gziped);

    if (process.env.NODE_ENV === 'development') {
      const decryptData = decrypt({ encryptedData });
      const ungzipedData = pako.ungzip(decryptData);
      const json = await decodePollenProtoBuf(ungzipedData);
      console.log(`decoded = ${JSON.stringify(json)}`);
    }

    const fileName = `${this.region.alias}${config.pbFileKeyNameSurfix}`;

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: encryptedData,
      ContentType: 'application/octet-stream',
      // Cache 1h
      CacheControl: 'no-cache=Set-Cookie,max-age=3600',
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload protobuf success: ${this.region.province.name}, ${this.region.city.name}, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }

  async uploadMockJson() {
    const { pollenResults = [], openWeatherResults = [] } = await this.getMockRawJson();

    if (pollenResults.length === 0) {
      throw new Error(`${this.region.city.name} have not content in last 3 months.`);
    }

    const str = JSON.stringify(this.mapToApiFromJson({ pollenResults, openWeatherResults }));

    const buffer = Buffer.from(str, 'utf8');
    const bodyJsonGz = pako.gzip(buffer);
    const fileName = `${this.region.alias}${config.fileKeyNameSurfix}`;

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: bodyJsonGz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      // Cache 3600s
      CacheControl: `public, max-age=${60 * 5}`,
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload json success: ${this.region.province.name}, ${this.region.city.name}, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }

  async uploadConfigJson(configData) {
    const str = JSON.stringify(configData);
    const buffer = Buffer.from(str, 'utf8');
    const bodyJsonGz = pako.gzip(buffer);
    const fileName = 'config.json';

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: bodyJsonGz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      // Cache 3600s
      CacheControl: 'no-cache=Set-Cookie,max-age=3600',
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload config json success, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }

  async uploadConfigProtoBuf(configData) {
    const fileName = 'config.bytes';
    const doc = configData;
    const buffer = await configToProtoBuf(doc);
    const gziped = pako.gzip(buffer);
    // Encrypt bytes using AES
    const { encryptedData } = encrypt(gziped);

    if (process.env.NODE_ENV === 'development') {
      const decryptData = decrypt({ encryptedData });
      const ungzipedData = pako.ungzip(decryptData);
      const json = await decodeConfigProtoBuf(ungzipedData);
      console.log(`decoded config = ${JSON.stringify(json)}`);
    }

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: encryptedData,
      ContentType: 'application/octet-stream',
      CacheControl: 'no-cache=Set-Cookie,max-age=3600', // Cache 1h
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload config json success, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }
}

module.exports = Publisher;
