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
model('Feed', FeedSchema);

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

module.exports = connect;
