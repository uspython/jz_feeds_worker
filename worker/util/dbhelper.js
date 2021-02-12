const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const timestamps = require('mongoose-timestamp');
const logger = require('../logger');

const FeedSchema = new Schema({
  cityId: { type: String, index: true },
  releaseDate: { type: Date, index: true },
  region: {
    provinceId: String,
    countryId: String,
  },
  pollenCount: String,
  forcastDate: Date,
  forcastCount: String,
});

FeedSchema.plugin(timestamps);
const Feed = model('Feed', FeedSchema);

function connect() {
  mongoose.connect(`${process.env.MONGO_URL}`, {
    useNewUrlParser: true,
    user: `${process.env.ME_CONFIG_MONGODB_ADMINUSERNAME}`,
    pass: `${process.env.ME_CONFIG_MONGODB_ADMINPASSWORD}`,
    autoIndex: process.env.NODE_ENV === 'development',
  }, (err) => {
    if (err) {
      logger.error(err);
    }
  });

  const { connection } = mongoose;
  connection.once('open', () => {
    // we're connected!
    logger.info('Database Connected!');
  });
}

function addFeed(theFeed) {
  Feed.create(theFeed, (err) => {
    if (err) {
      logger.warn(err);
      return;
    }

    logger.info(`New Feed Created, ${theFeed}`);
  });
}

function alterFeed(theFeed) {
  const { cityId, releaseDate } = theFeed;
  Feed.updateOne({ cityId, releaseDate }, { ...theFeed },
    // [options.upsert=false] «Boolean» if true, and no documents found, insert a new document
    { upsert: true },
    (err, res) => {
      if (err) {
        logger.warn(err);
        return 0;
      }

      logger.info(`Feed Altered, ${cityId}, ${releaseDate}, ${res.nModified} modified`);

      return res.nModified;
    });
}

function deleteFeed(theFeed) {
  const { cityId, releaseDate } = theFeed;
  const d = Feed.deleteOne({ cityId, releaseDate }, (err) => {
    if (err) {
      logger.warn(err);
      return null;
    }

    logger.info(`Feed Deleted, ${theFeed}`);
  });

  return d;
}

async function queryCityFeeds(filter) {
  // const { cityId, releaseDate } = theFeed;

  try {
    const ret = await Feed.find({ ...filter })
      .lean()
      .sort({ releaseDate: -1 })
      .exec();

    return ret;
  } catch (e) {
    logger.info(`query city feeds error${e}`);

    return [];
  }
}

module.exports.connect = connect;
module.exports.addFeed = addFeed;
module.exports.alterFeed = alterFeed;
module.exports.deleteFeed = deleteFeed;
module.exports.queryCityFeeds = queryCityFeeds;
