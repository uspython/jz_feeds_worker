const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const timestamps = require('mongoose-timestamp');

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

module.exports = Feed;
