import dayjs from 'dayjs';
import {
  connect,
  addOneFeed,
  addManyFeeds,
  alterFeed,
  deleteFeed,
  queryCityFeeds,
} from './dbhelper';

const Feed = process.env.NODE_ENV === 'development'
  ? require('../models/mock_feed')
  : require('../models/feed');

test('Connect mongodb be mongoose', () => {
  expect(() => connect()).not.toThrow(Error);
});

const testFeed = {
  cityId: '11010010105',
  region: {
    provinceId: '11010010101',
    countryId: '11010010103',
  },
  releaseDate: dayjs('2020-11-11').startOf('day').valueOf(),
  pollenCount: '1',
  forcastDate: dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf(),
  forcastCount: '500 - 800',
};

test('Insert Feed', () => {
  expect(() => addOneFeed(testFeed)).not.toThrow(Error);
});

test('should insert many feeds without error', async (done) => {
  const feeds = [testFeed, testFeed, testFeed];
  // eslint-disable-next-line no-return-await
  expect(async () => {
    await addManyFeeds(feeds);

    const c = await Feed.countDocuments();
    expect(c).toBeGreaterThanOrEqual(4);
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
    forcastDate: dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf(),
    forcastCount: '500 - 800',
  };

  expect(async () => {
    await alterFeed(newFeed);

    try {
      const results = await queryCityFeeds(newFeed);

      const [{
        cityId, releaseDate, forcastDate, pollenCount,
      }] = results;

      expect(results.length).not.toBe(0);
      expect(cityId).toBe('445200000000');
      expect(releaseDate.valueOf()).toBe(dayjs('2020-11-11').startOf('day').valueOf());
      expect(forcastDate.valueOf()).toBe(dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf());
      expect(pollenCount).toBe('4');

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

test('Alter Feed by Add New One', async (done) => {
  const theFeed = {
    cityId: '445200000000',
    region: {
      provinceId: '11010010101',
      countryId: '11010010103',
    },
    releaseDate: dayjs('2020-11-11').startOf('day').valueOf(),
    pollenCount: '5',
    forcastDate: dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf(),
    forcastCount: '500 - 800',
  };

  expect(() => alterFeed(theFeed)).not.toThrow(Error);

  try {
    setTimeout(async () => {
      const results = await queryCityFeeds({
        cityId: '445200000000',
        region: {
          provinceId: '11010010101',
          countryId: '11010010103',
        },
      });

      expect(results.length).not.toBe(0);

      const [{
        cityId, releaseDate, forcastDate, pollenCount,
      }] = results;
      expect(cityId).toBe('445200000000');
      expect(releaseDate.valueOf()).toBe(dayjs('2020-11-11').startOf('day').valueOf());
      expect(forcastDate.valueOf()).toBe(dayjs('2020-11-11').add(1, 'day').startOf('day').valueOf());
      expect(pollenCount).toBe('5');

      done();
    }, 200);
  } catch (error) {
    done(error);
  }
});
