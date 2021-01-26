const Feed = model('Feed', FeedSchema);

const testFeed = new Feed({
  cityId: '11010010102',
  region: { provinceId: '11010010101', countryId: '11010010103' },
  releaseDate: Date.now() - 3600 * 60 * 24,
  pollenCount: '1',
  forcastDate: Date.now() + 3600 * 60 * 24,
  forcastCount: '500 - 800',
});

testFeed.save();
