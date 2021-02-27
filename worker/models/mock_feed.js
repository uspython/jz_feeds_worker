const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const MockFeedSchema = new Schema({
  cityId: { type: String, index: true },
  releaseDate: { type: Date, index: true },
  region: {
    provinceId: String,
    countryId: String,
  },
  pollenCount: String,
  forecastDate: Date,
  forecastCount: String,
}, {
  timestamps: {
    createdAt: 'createdAt',
    updateAt: 'updateAt',
  },
});

const MockFeed = model('MockFeed', MockFeedSchema);

module.exports = MockFeed;
