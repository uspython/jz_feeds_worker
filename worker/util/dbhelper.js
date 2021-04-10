const mongoose = require('mongoose');
const logger = require('../logger');

const Feed = require('../models/feed');

function addMarsValue(countStr) {
  let ret = parseInt(countStr, 10) || 0;

  if (ret === 0) {
    return `${Math.floor(Math.random() * 2)}`;
  }

  const errValue = 5;
  const r = Math.floor(Math.random() * errValue);
  ret += r > 2 ? (r - errValue) : r;

  return `${ret <= 0 ? 0 : ret}`;
}

async function connect() {
  await mongoose.connect(`${process.env.MONGO_URL}`, {
    useNewUrlParser: true,
    user: `${process.env.ME_CONFIG_MONGODB_ADMINUSERNAME}`,
    pass: `${process.env.ME_CONFIG_MONGODB_ADMINPASSWORD}`,
    autoIndex: process.env.NODE_ENV === 'development',
  }, (err) => {
    if (err) {
      logger.error({ err });
    }
  });

  const { connection } = mongoose;
  connection.once('open', () => {
    // we're connected!
    logger.info('Database Connected!');
  });
}

async function disconnect() {
  await mongoose.disconnect();
  // we're connected!
  logger.info('Database Disonnected!');
}

function addOneFeed(theFeed) {
  const { pollenCount } = theFeed;

  Feed.create({
    marsPollenCount: addMarsValue(pollenCount),
    ...theFeed,
  }, (err) => {
    if (err) {
      logger.warn(err);
      return;
    }

    logger.info(`New Feed Created, ${theFeed}`);
  });
}

async function addManyFeeds(feeds) {
  const mars = [...feeds].map((feed) => {
    const { pollenCount } = feed;
    return {
      marsPollenCount: addMarsValue(pollenCount),
      ...feed,
    };
  });
  const d = await Feed.insertMany(mars);
  return d.length;
}

async function alterFeed(theFeed, createNew) {
  const {
    cityId, releaseDate, pollenCount, region,
  } = theFeed;
  const { upsert } = createNew || { upsert: true };
  const { nModified = 0, n } = await Feed.updateOne(
    { cityId, releaseDate, region },
    {
      marsPollenCount: addMarsValue(pollenCount),
      ...theFeed,
    },
    // [options.upsert=false] «Boolean» if true, and no documents found, insert a new document
    { upsert },
  );

  logger.info(`Feed Altered, ${cityId}, ${releaseDate}, ${n} matched, ${nModified} modified.`);
  return nModified;
}

function deleteFeed(theFeed) {
  const { cityId, releaseDate } = theFeed;
  const d = Feed.deleteOne({ cityId, releaseDate }, (err) => {
    if (err) {
      logger.warn(err);
      return null;
    }

    logger.info(`Feed Deleted, ${theFeed}`);
    return 1;
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
module.exports.addOneFeed = addOneFeed;
module.exports.addManyFeeds = addManyFeeds;
module.exports.alterFeed = alterFeed;
module.exports.deleteFeed = deleteFeed;
module.exports.disconnect = disconnect;
module.exports.queryCityFeeds = queryCityFeeds;
module.exports.Feed = Feed;
module.exports.addMarsValue = addMarsValue;
