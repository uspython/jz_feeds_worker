import dayjs from 'dayjs';
import {
  connect,
  addFeed,
  alterFeed,
  deleteFeed,
  queryCityFeeds,
} from './dbhelper';

test('Connect mongodb be mongoose', () => {
  expect(() => connect()).not.toThrow(Error);
});

const testFeed = {
  cityId: '11010010105',
  region: {
    provinceId: '11010010101',
    countryId: '11010010103',
  },
  releaseDate: dayjs().startOf('day').millisecond(),
  pollenCount: '1',
  forcastDate: dayjs().add(1, 'day').startOf('day').millisecond(),
  forcastCount: '500 - 800',
};

test('Insert Feed', () => {
  expect(() => addFeed(testFeed)).not.toThrow(Error);
});

test('Alter Feed by Add New One', async (done) => {
  const newFeed = {
    cityId: '11010010104',
    region: {
      provinceId: '11010010101',
      countryId: '11010010103',
    },
    releaseDate: dayjs().startOf('day').millisecond(),
    pollenCount: '4',
    forcastDate: dayjs().add(1, 'day').startOf('day').millisecond(),
    forcastCount: '500 - 800',
  };

  expect(() => alterFeed(newFeed)).not.toThrow(Error);

  try {
    const results = await queryCityFeeds(newFeed);

    const [{
      cityId, releaseDate, forcastDate, pollenCount,
    }] = results;

    expect(results.length).not.toBe(0);
    expect(cityId).toBe('11010010104');
    expect(releaseDate.valueOf()).toBe(dayjs().startOf('day').millisecond());
    expect(forcastDate.valueOf()).toBe(dayjs().add(1, 'day').startOf('day').millisecond());
    expect(pollenCount).toBe('4');

    done();
  } catch (error) {
    done(error);
  }
});

test('Query City Feed', async (done) => {
  try {
    const results = await queryCityFeeds({ cityId: '11010010104' });

    const [{ cityId }] = results;

    expect(results.length).not.toBe(0);
    expect(cityId).toBe('11010010104');
    done();
  } catch (error) {
    // eslint-disable-next-line no-console
    expect(error).not.toMatch('error');
    done(error);
  }
});

test('Delete Feed', () => {
  expect(() => {
    const r = deleteFeed(testFeed);
    expect(r).not.toBeNull();
  }).not.toThrow(Error);
});

test('Alter Feed by Add New One', async (done) => {
  const theFeed = {
    cityId: '11010010104',
    region: {
      provinceId: '11010010101',
      countryId: '11010010103',
    },
    releaseDate: dayjs().startOf('day').millisecond(),
    pollenCount: '5',
    forcastDate: dayjs().add(1, 'day').startOf('day').millisecond(),
    forcastCount: '500 - 800',
  };

  expect(() => alterFeed(theFeed)).not.toThrow(Error);

  try {
    const results = await queryCityFeeds(theFeed);

    expect(results.length).not.toBe(0);

    const [{
      cityId, releaseDate, forcastDate, pollenCount,
    }] = results;
    expect(cityId).toBe('11010010104');
    expect(releaseDate.valueOf()).toBe(dayjs().startOf('day').millisecond());
    expect(forcastDate.valueOf()).toBe(dayjs().add(1, 'day').startOf('day').millisecond());
    expect(pollenCount).toBe('5');

    done();
  } catch (error) {
    done(error);
  }
});
