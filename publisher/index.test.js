import dayjs from 'dayjs';
import Publisher from '.';
import config from '../worker/config';
import {
  addOneFeed, connect,
  disconnect,
} from '../worker/util/dbhelper';
import {
  aliasFromRegion, regionFromId, regionFromWeather, remoteConfigJson,
} from '../worker/util/worker_helper';

const testBucket = {
  name: config.bucketName,
};

describe('Test Mock 赛罕区 Saihan Publisher', () => {
  beforeAll(() => {
    connect();
  });
  const e = {
    // 内蒙古呼和浩特赛罕区
    provinceId: '150000000000',
    cityId: '150100000000',
    countryId: '150105000000',
    lat: '40.79839423697477',
    lng: '111.70842064450414',
  };

  const testFeed = {
    cityId: e.cityId,
    region: {
      provinceId: e.provinceId,
      countryId: e.countryId,
    },
    releaseDate: dayjs().startOf('day').valueOf(),
    pollenCount: '1',
    marsPollenCount: '0',
    forecastDate: dayjs().add(1, 'day').startOf('day').valueOf(),
    forecastCount: '500 - 800',
  };

  test('Insert Saihan Feed', () => {
    expect(() => addOneFeed(testFeed)).not.toThrow(Error);
  });

  test('should get saihan mock json', async () => {
    const region = regionFromId(e.provinceId, e.cityId, e.countryId);
    region.weatherid = 1529102;
    const fileName = aliasFromRegion(region);

    expect(region.province.name).toBe('内蒙古自治区');
    expect(region.city.name).toBe('呼和浩特市');
    expect(region.country.name).toBe('赛罕区');
    expect(fileName).toBe('innermongolia_hohhot_saihan');

    expect(region.coord.lat).toBe(e.lat);
    expect(region.coord.lng).toBe(e.lng);

    const p = new Publisher(region, testBucket);
    const { pollenResults = [], openWeatherResults = [] } = await p.getMockRawJson();

    expect(pollenResults.length).not.toBe(0);
    expect(openWeatherResults.length).not.toBe(0);

    const [pollen] = pollenResults;
    const [w] = openWeatherResults;

    expect(pollen.region.countryId).toBe(region.country.id);
    expect(w.id).toBe(region.weatherid);
  });
});

describe('Test AWS Publisher 包头', () => {
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

describe('Test AWS Publisher 沧州', () => {
  beforeAll(() => {
    connect();
  });

  afterAll(() => {
    setTimeout(() => {
      disconnect();
    }, 3000);
  });

  const theRegion = regionFromWeather('沧州');
  theRegion.weatherid = 1816080;
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
