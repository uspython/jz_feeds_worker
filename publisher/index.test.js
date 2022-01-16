import Publisher from '.';
import config from '../worker/config';
import {
  connect,
  disconnect,
} from '../worker/util/dbhelper';
import {
  regionFromWeather, remoteConfigJson,
} from '../worker/util/worker_helper';

const testBucket = {
  name: config.bucketName,
};

describe('Test AWS Publisher', () => {
  beforeAll(() => {
    connect();
  });

  afterAll(() => {
    setTimeout(() => {
      disconnect();
    }, 800);
  });

  const theRegion = regionFromWeather('包头');
  theRegion.weatherid = 2038432;
  const publisher = new Publisher(theRegion, testBucket);

  test('should return buckets', async () => {
    const b = await publisher.listBuckets();

    expect(b.length).not.toBe(0);
  });

  test('should get pollen json in latest 7 days', async () => {
    const { pollenResults = [], openWeatherResults = [] } = await publisher.getMockRawJson();

    expect(pollenResults.length).not.toBe(0);
    expect(openWeatherResults.length).not.toBe(0);
  });

  test("should upload city's json file to s3 with gzip", async () => {
    const run = async () => {
      const status = await publisher.uploadMockJson();
      expect(status).not.toBe(0);
    };

    let err = null;
    try {
      await run();
    } catch (error) {
      err = error;
    }

    expect(err).toBeNull();
  });

  test("should upload city's config json file to s3", async () => {
    const run = async () => {
      const p = new Publisher(theRegion, testBucket);
      const cityConfig = remoteConfigJson();
      const status = await p.uploadConfigJson(cityConfig);
      expect(status).not.toBe(0);
    };

    let err = null;
    try {
      await run();
    } catch (error) {
      err = error;
    }

    expect(err).toBeNull();
  });
});
