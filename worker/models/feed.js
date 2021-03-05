const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FeedSchema = new Schema({
  cityId: { type: String, index: true },
  releaseDate: { type: Date, index: true },
  region: {
    provinceId: String,
    countryId: String,
  },
  pollenCount: String,
  forecastDate: Date,
  forecastCount: String,
  marsPollenCount: String,
}, {
  timestamps: {
    createdAt: 'createdAt',
    updateAt: 'updateAt',
  },
});

const Feed = model('Feed', FeedSchema);
// Feed.ensureIndexes();
module.exports = Feed;
