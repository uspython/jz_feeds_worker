const {
  connect,
  disconnect,
} = require('../util/dbhelper');
const {
  WeatherDefaultDate,
  regionFrom,
} = require('../util/worker_helper');

const JZHuhehaoteWorker = require('./index');

const HuhehaoteCountry = { saihan: '150105000000', xincheng: '150102000000' };

const defaultRegion = regionFrom('赛罕区');

describe('Test 呼和浩特 Feed Worker', () => {
  describe('Test 呼和浩特 Feed Worker with Mongodb', () => {
    beforeAll(() => {
      connect();
    });

    afterAll(() => {
      setTimeout(() => {
        disconnect();
      }, 500);
    });

    test(`should get initial date range: ${WeatherDefaultDate}/`, async () => {
      const w = new JZHuhehaoteWorker(defaultRegion);
      const { from, to } = await w.getNextDayRange();
      expect(from).toBe(WeatherDefaultDate);
      expect(to).toBe(WeatherDefaultDate);
    });

    test('fetch api should return raw data', async () => {
      const w = new JZHuhehaoteWorker(defaultRegion);
      const rawData = await w.fetchRawData();
      expect(rawData.length).not.toBe(0);
    });

    test('fetch api should return feeds', async () => {
      const mockData = [
        { skDate: '2021-04-02', skSouth: '68', skNorth: '21' },
        { skDate: '2021-04-03', skSouth: '45', skNorth: '35' },
        { skDate: '2021-04-04', skSouth: '105', skNorth: '55' },
        { skDate: '2021-04-05', skSouth: '25', skNorth: '21' },
        { skDate: '2021-04-06', skSouth: '43', skNorth: '19' },
        { skDate: '2021-04-07', skSouth: '2486', skNorth: '21' },
        { skDate: '2021-04-08', skSouth: '1525', skNorth: '81' },
      ];

      const w = new JZHuhehaoteWorker(defaultRegion);
      const feeds = w.feedsFrom(mockData);

      expect(feeds.length).toBe(14);

      const saihanFeeds = feeds.filter((f) => f.region.countryId === HuhehaoteCountry.saihan);
      expect(saihanFeeds.length).toBe(7);

      const maxFeed = feeds
        .sort((a, b) => parseInt(b.pollenCount, 10) - parseInt(a.pollenCount, 10))[0];
      expect(maxFeed.pollenCount).toBe('2486');
    });
  });
});
