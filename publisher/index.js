
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
const {
  cityEnNameFrom, provinceFrom, countryFrom,
} = require('../worker/util/worker_helper');

const credentials = new AWS.SharedIniFileCredentials({ profile: 'default' });
const myConfig = new AWS.Config({
  credentials,
  region: config.awsRegion,
});
AWS.config.update(myConfig);

class Publisher {
  /**
   * @param {aCity} city Object
   * @param {bucket} bucket s3 bucket
   */
  constructor(city, bucket) {
    this.bucket = bucket || { name: config.bucketName };
    this.city = city || { id: '', name: 'unknow city name' };
    const enName = cityEnNameFrom(this.city.province + this.city.name);
    this.city.enName = enName;
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
        cityId: this.city.id,
        releaseDate: { $gte: dayjs().add(-7, 'day').startOf('day').add(8, 'hours') },
      },
      null,
      { sort: { releaseDate: -1 } },
    )
      .select({
        __v: 0,
        _id: 0,
        createdAt: 0,
        updatedAt: 0,
        cityId: 0,
      })
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

    // TODO: (Jeff) set countryId here
    const pollenData = Object.keys(groupByRegion)
      .map((countryId) => ({
        latest: groupByRegion[countryId],
        region: {
          province: provinceFrom(this.city),
          city: this.city,
          country: countryFrom(this.city, this.city.id),
        },
      }));

    return {
      success: true,
      message: '',
      data: {
        timestamp: dayjs().valueOf(),
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

      fs.writeFile(`${archiveDir}/${this.city.enName}_${config.fileKeyNameSurfix}.gz`, data, (e) => {
        if (!e) {
          logger.info(`archive ${this.city.enName} successfully`);
        }
      });
    });
  }

  async uploadJson() {
    const jsonResults = await this.getRawJson();

    if (jsonResults.length === 0) {
      throw new Error(`${this.city.name} have not content in last 7 days.`);
    }

    const str = JSON.stringify(this.mapToApiFromJson(jsonResults));
    const buffer = Buffer.from(str);
    const bodyJsonGz = pako.gzip(buffer);
    const fileName = `${this.city.enName}_${config.fileKeyNameSurfix}`;

    // call S3 to retrieve upload file to specified bucket
    const uploadParams = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: bodyJsonGz,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    };

    const { ETag } = await this.s3.send(new PutObjectCommand(uploadParams));
    logger.info(`upload json success: ${this.city.province}, ${this.city.name}, etag: ${ETag}`);
    // Archive
    // this.archiveFileFrom(bodyJsonGz);
    return 1;
  }
}

module.exports = Publisher;
