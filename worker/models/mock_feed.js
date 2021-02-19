const { FeedSchema} = require('./feed');

const MockFeed = model('MockFeed', FeedSchema);

module.exports = MockFeed;