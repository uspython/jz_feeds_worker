const dayjs = require('dayjs');
const {
  connect,
  disconnect,
  alterFeed,
} = require('./util/dbhelper');
const {
  cityFrom,
  getEnNameWith,
  callbackFromWeather,
  provinceFrom,
  cityCnNameFrom,
  WeatherDefaultDate,
  randomizeArray,
  countryFrom,
  getCityCodeWith,
  searchFromCountry,
  regionFrom,
} = require('./util/worker_helper');
const config = require('./config');

const JZFeedWorker = require('./index');

describe('Test City Utility', () => {
  test('should randomize the Array', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

    const r = randomizeArray(a);

    expect(r[9]).not.toBe(0);
    expect(r.length).toBe(10);
  });

  test('should return beijing', () => {
    const testCity = cityFrom('北京');

    expect(testCity.province).toBe('北京市');
    expect(testCity.name).toBe('市辖区');
    expect(testCity.id).toBe('110100000000');
  });

  test('should return Xian', () => {
    const testCity = cityFrom('西安');

    expect(testCity.province).toBe('陕西省');
    expect(testCity.name).toBe('西安市');
    expect(testCity.id).toBe('610100000000');
  });

  test('should return Zibo', () => {
    const testCity = cityFrom('淄博');

    expect(testCity.province).toBe('山东省');
    expect(testCity.name).toBe('淄博市');
  });

  test("should return city's english name", () => {
    const enName = getEnNameWith('乌鲁木齐');

    expect(enName.length).not.toBe(0);
    expect(enName).toBe('wulumuqi');
  });

  test("should return city's english code", () => {
    const code = getCityCodeWith('承德');

    expect(code.length).not.toBe(0);
    expect(code).toBe('chegnde');
  });

  test("should return city's chinese name", () => {
    const name = cityCnNameFrom('wulumuqi');

    expect(name.length).not.toBe(0);
    expect(name).toBe('乌鲁木齐');
  });

  test('should return a provice', () => {
    const testCity = cityFrom('沈阳');
    const p = provinceFrom(testCity);

    expect(p.name).toBe('辽宁省');
    expect(p.id).toBe('210000000000');
  });

  test('should return a country', () => {
    // 321323000000
    const testCity = cityFrom('宿迁');
    const country = countryFrom(testCity, '321323000000');

    expect(country).not.toBeNull();
    expect(country.id).toBe('321323000000');
    expect(country.name).toBe('泗阳县');
  });

  test('should search country from CountryMap', () => {
    const country = searchFromCountry('乌兰浩特');
    expect(country).not.toBeNull();
    expect(country.city).toBe('兴安盟');
  });

  test('should get region with city name', () => {
    const { province, city, country } = regionFrom('宿迁');
    const testCity = cityFrom('宿迁');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);
  });

  test('should get region with country name 1', () => {
    const { province, city, country } = regionFrom('乌兰浩特');

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe('152201000000');
    expect(country.city).toBe('兴安盟');
    expect(city.name).toBe('兴安盟');
    expect(province.id).toBe('150000000000');
  });

  test('should get region with country name 2', () => {
    const { province, city, country } = regionFrom('泗阳');

    const testCity = cityFrom('宿迁');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe('321323000000');
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);
  });

  test('should reture all region objectid', () => {
    const regionObjects = [];
    for (let idx = 0; idx < config.weatherCitys.length; idx += 1) {
      const { cn } = config.weatherCitys[idx];
      const r = regionFrom(cn);

      regionObjects.push(r);
    }

    expect(regionObjects.length).toBe(config.weatherCitys.length);

    for (let index = 0; index < regionObjects.length; index += 1) {
      const { province, city, country } = regionObjects[index];

      expect(province).not.toBeNull();
      expect(city).not.toBeNull();
      expect(country).not.toBeNull();
    }
  });
});

describe('Test JZFeedWorker', () => {
  beforeAll(() => {
    connect();
  });

  afterAll(() => {
    setTimeout(() => {
      disconnect();
    }, 500);
  });
  test(`should get initial date range: ${WeatherDefaultDate}/`, async () => {
    const region = regionFrom('肇庆');
    const w = new JZFeedWorker(region);
    const { from, to } = await w.getMonthRange();
    expect(from).toBe(WeatherDefaultDate);
    expect(to).toBe(dayjs(WeatherDefaultDate).endOf('month').format('YYYY-MM-DD'));
  });

  test('should get test month range: 2020-11-11/2020-11-12', () => {
    expect(async () => {
      const jieyang = regionFrom('揭阳');
      const w = new JZFeedWorker(jieyang);
      const { from, to } = await w.getMonthRange();
      expect(from).toBe('2020-11-12');
      expect(to).toBe('2020-11-30');
    }).not.toThrowError();
  });

  test('month range should before (NOW + 1Day)', async () => {
    const testRegion = regionFrom('烟台');
    const today = dayjs().startOf('day').add(8, 'hours');

    const newFeed = {
      cityId: testRegion.city.id,
      region: {
        provinceId: testRegion.province.id,
        countryId: testRegion.country.id,
      },
      releaseDate: today.valueOf(),
      pollenCount: '488',
      marsPollenCount: '88',
      forecastDate: today.add(1, 'day').valueOf(),
      forecastCount: '500 - 800',
    };

    const count = await alterFeed(newFeed);
    const w = new JZFeedWorker(testRegion);
    const { from, to } = await w.getMonthRange();

    expect(count).toBeGreaterThanOrEqual(1);
    expect(from).toBe(today.add(1, 'day').format('YYYY-MM-DD'));
    expect(to).toBe(today.add(1, 'day').format('YYYY-MM-DD'));
  });

  test('should get test date: 2020-11-12', async () => {
    const jieyang = regionFrom('揭阳');
    const w = new JZFeedWorker(jieyang);
    const { from, to } = await w.getNextDayRange();
    expect(from).toBe('2020-11-12');
    expect(to).toBe('2020-11-12');
  });

  test('fetch weather api should return raw data', async () => {
    const testCity = regionFrom('北京');
    const w = new JZFeedWorker(testCity);
    const nextDay = await w.getNextDayRange();
    const rawData = await w.fetchRawDataFromWeather({
      from: nextDay, to: nextDay,
    });

    expect(rawData.length).not.toBe(0);
  });

  test('should get feeds from weather raw data', () => {
    const mockData = [{
      elenum: 1,
      week: '星期三',
      addTime: '2020-03-11',
      city: '北京',
      level: '偏高',
      cityCode: 'beijing',
      num: 202.00,
      eletype: '花粉',
      content: '敏感人群减少外出，外出需防护。',
    }];

    const testRegion = regionFrom('北京');
    const w = new JZFeedWorker(testRegion);
    const feeds = w.feedsFromWeatherRaw(mockData);

    expect(feeds.length).not.toBe(0);

    const [{
      cityId, pollenCount, releaseDate, region,
    }] = feeds;
    expect(cityId).toBe(testRegion.city.id);
    expect(releaseDate).toBe(dayjs('2020-03-11').startOf('day').add(8, 'hours').valueOf());
    expect(region.provinceId).toBe(testRegion.province.id);
    expect(pollenCount).toBe('202');
  });

  test('should get a datalist object with regex', () => {
    const resp = 'callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2020-03-01","city":"","level":"","cityCode":"","num":"","eletype":"花粉","content":""}]})';

    const r = callbackFromWeather(resp);
    expect(r).not.toBeNull();
    expect(r.length).not.toBe(0);

    const { dataList } = r;
    expect(dataList.length).not.toBe(0);
  });
});
