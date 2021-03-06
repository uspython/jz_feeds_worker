import dayjs from 'dayjs';
import {
  connect,
  addOneFeed,
  addManyFeeds,
  alterFeed,
  deleteFeed,
  queryCityFeeds,
  disconnect,
} from './dbhelper';

const Feed = require('../models/feed');

describe('Test dbhelper', () => {
  describe('connect db', () => {
    test('Connect mongodb be mongoose', () => expect(() => connect()).not.toThrow(Error));
  });

  describe('test curd', () => {
    const testFeed = {
      cityId: '11010010105',
      region: {
        provinceId: '11010010101',
        countryId: '11010010103',
      },
      releaseDate: dayjs('2020-11-11').startOf('day').valueOf(),
      pollenCount: '1',
      marsPollenCount: '0',
      forecastDate: dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf(),
      forecastCount: '500 - 800',
    };

    test('Insert Feed', () => {
      expect(() => addOneFeed(testFeed)).not.toThrow(Error);
    });

    test('should insert many feeds without error', async (done) => {
      const feeds = [testFeed, testFeed, testFeed];
      // eslint-disable-next-line no-return-await
      expect(async () => {
        const count = await addManyFeeds(feeds);

        const c = await Feed.countDocuments();
        expect(c).toBeGreaterThanOrEqual(4);
        expect(count).toBe(3);
      }).not.toThrow(Error);

      done();
    });

    test('Alter Feed by Add New One', async (done) => {
      const newFeed = {
        cityId: '445200000000',
        region: {
          provinceId: '11010010101',
          countryId: '11010010103',
        },
        releaseDate: dayjs('2020-11-11').startOf('day').valueOf(),
        pollenCount: '4',
        marsPollenCount: '6',
        forecastDate: dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf(),
        forecastCount: '500 - 800',
      };

      expect(async () => {
        await alterFeed(newFeed);

        try {
          const results = await queryCityFeeds(newFeed);

          const [{
            cityId, releaseDate, forecastDate, pollenCount, marsPollenCount,
          }] = results;

          expect(results.length).not.toBe(0);
          expect(cityId).toBe('445200000000');
          expect(releaseDate.valueOf()).toBe(dayjs('2020-11-11').startOf('day').valueOf());
          expect(forecastDate.valueOf()).toBe(dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf());
          expect(pollenCount).toBe('4');
          expect(marsPollenCount).toBe('6');

          done();
        } catch (error) {
          done(error);
        }
      }).not.toThrow(Error);
    });

    test('Query City Feed', async (done) => {
      try {
        const results = await queryCityFeeds({ cityId: '445200000000' });

        const [{ cityId }] = results;

        expect(results.length).not.toBe(0);
        expect(cityId).toBe('445200000000');
        done();
      } catch (error) {
        // eslint-disable-next-line no-console
        expect(error).not.toMatch('error');
        done(error);
      }
    });

    test('Delete Feed', () => {
      expect(async () => {
        const r = deleteFeed(testFeed);
        expect(r).not.toBeNull();

        await Feed.deleteMany(testFeed);
      }).not.toThrow(Error);
    });
  });

  describe('disconnect db', () => {
    test('Disconnect mongodb be mongoose', () => {
      setTimeout(() => {
        expect(() => disconnect()).not.toThrow(Error);
      }, 300);
    });
  });
});
