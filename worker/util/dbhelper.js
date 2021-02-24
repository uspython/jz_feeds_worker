const mongoose = require('mongoose');
const logger = require('../logger');

const Feed = require('../models/feed');

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

function disconnect() {
  mongoose.disconnect().then(() => {
    // we're connected!
    logger.info('Database Disonnected!');
  });
}

function addOneFeed(theFeed) {
  Feed.create(theFeed, (err) => {
    if (err) {
      logger.warn(err);
      return;
    }

    logger.info(`New Feed Created, ${theFeed}`);
  });
}

async function addManyFeeds(feeds) {
  const d = await Feed.insertMany(feeds);
  return d.length;
}

async function alterFeed(theFeed) {
  const { cityId, releaseDate } = theFeed;
  const { nModified = 0 } = await Feed.updateOne(
    { cityId, releaseDate },
    { ...theFeed },
    // [options.upsert=false] «Boolean» if true, and no documents found, insert a new document
    { upsert: true },
  );

  logger.info(`Feed Altered, ${cityId}, ${releaseDate}, ${nModified} modified`);
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
