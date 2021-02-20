const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const timestamps = require('mongoose-timestamp');

const MockFeedSchema = new Schema({
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

MockFeedSchema.plugin(timestamps);

const MockFeed = model('MockFeed', MockFeedSchema);

module.exports = MockFeed;
