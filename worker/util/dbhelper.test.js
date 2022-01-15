import dayjs from 'dayjs';
import config from '../config';
import fetch from '../fetch';
import {
  addManyFeeds, addOneFeed, addWeatherFeed,
  alterFeed, connect, deleteFeed, disconnect, queryCityFeeds,
  queryWeatherFeed,
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
          provinceId: '440000000000',
          countryId: '445200000000',
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

  describe('test weather curd', () => {
    const testFeed = JSON.parse('{"coord":{"lon":122.0833,"lat":46.0833},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01n"}],"base":"stations","main":{"temp":254.73,"feels_like":254.73,"temp_min":254.73,"temp_max":254.73,"pressure":1030,"humidity":95,"sea_level":1030,"grnd_level":990},"visibility":10000,"wind":{"speed":1.16,"deg":290,"gust":1.07},"clouds":{"all":8},"dt":1641483488,"sys":{"country":"CN","sunrise":1641425611,"sunset":1641457240},"timezone":28800,"id":2034312,"name":"Ulanhot","cod":200}');

    test('Insert Weather Feed', () => {
      expect(() => addWeatherFeed(testFeed)).not.toThrow(Error);
    });

    test('should get weather feed from api, and insert to db', async (done) => {
      try {
        const url = config.openWeatherApi;
        const requestParams = { id: 2034312, appid: config.openWeatherApiToken };

        const { status, statusText, data } = await fetch(
          'GET',
          url,
          null,
          requestParams,
        );

        if (status === 200 || statusText === 'OK') {
          const aWeatherFeed = data;
          expect(aWeatherFeed.dt).not.toBeNull();

          const results = await queryWeatherFeed({ id: 2034312 });
          const [{ id, dt }] = results;

          expect(aWeatherFeed.dt).toBeGreaterThan(dt);
          expect(id).toBe(aWeatherFeed.id);

          if (!results || results.length === 0) {
            addWeatherFeed(aWeatherFeed);
          } else if (aWeatherFeed.dt > dt) {
            addWeatherFeed(aWeatherFeed);
          }

          done();
        }
      } catch (error) {
        console.log(error);
        expect(error).toBeNull();
        done(error);
      }
    });

    test('should reture not empty', async (done) => {
      const results = await queryWeatherFeed({ id: 2034312 });
      const [{ id }] = results;

      expect(results.length).not.toBe(0);
      expect(id).toBe(2034312);
      done();
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
