const AWS = require('aws-sdk');
const {
  S3Client, ListBucketsCommand, PutObjectCommand,
} = require('@aws-sdk/client-s3');
const dayjs = require('dayjs');
const pako = require('pako');
const fs = require('fs');
const _ = require('lodash');
const config = require('../worker/config');
const Feed = require('../worker/models/feed');
const logger = require('../worker/logger');
const { aliasFromRegion } = require('../worker/util/worker_helper');

const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
const myConfig = new AWS.Config({
  credentials,
  region: config.awsRegion,
});
AWS.config.update(myConfig);

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

  async getRawJson() {
    const results = await Feed.find(
      {
        cityId: this.region.city.id,
        releaseDate: { $gte: dayjs().add(-6, 'day').startOf('day').add(8, 'hours') },
      },
      null,
      { sort: { releaseDate: -1 } },
    )
      .select({
        __v: 0,
        _id: 0,
        createdAt: 0,
        cityId: 0,
        pollenCount: 0,
      })
      .lean()
      .exec();

    return results;
  }

  async getMockRawJson() {
    const results = await Feed.find(
      {
        cityId: this.region.city.id,
        releaseDate: { $gte: dayjs().add(-3, 'month').startOf('day').add(8, 'hours') },
      },
      null,
      { sort: { releaseDate: -1 } },
    )
      .select({
        __v: 0,
        _id: 0,
        createdAt: 0,
        cityId: 0,
        pollenCount: 0,
      })
      .limit(10)
      .lean()
      .exec();

    return results;
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
    const groupByRegion = _.groupBy(json, 'region.countryId');
    const theRegion = this.region;

    const pollenData = Object.keys(groupByRegion)
      .map((countryId) => ({
        latest: groupByRegion[countryId],
        region: theRegion,
      }));

    return {
      success: true,
      message: '',
      data: {
        pollen_data: pollenData,
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
    const jsonResults = await this.getRawJson();

    if (jsonResults.length === 0) {
      logger.info(`${this.region.city.name} have not content in last 7 days.`);
      return 0;
    }

    const str = JSON.stringify(this.mapToApiFromJson(jsonResults));

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
      CacheControl: 'Cache-Control:no-cache=Set-Cookie;max-age=3600',
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));

    this.s3.destroy();
    this.s3 = null;

    logger.info(`upload json success: ${this.region.province.name}, ${this.region.city.name}, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }

  async uploadMockJson() {
    const jsonResults = await this.getMockRawJson();

    if (jsonResults.length === 0) {
      throw new Error(`${this.region.city.name} have not content in last 3 months.`);
    }

    const str = JSON.stringify(this.mapToApiFromJson(jsonResults));

    console.log(str);

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
      CacheControl: 'Cache-Control:no-cache=Set-Cookie;max-age=3600',
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
