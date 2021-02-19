const dayjs = require('dayjs');
const {
  connect,
  addOneFeed,
  queryCityFeeds,
} = require('./util/dbhelper');
const { 
  cityFrom, 
  cityEnNameFrom,
  callbackFromWeather,
  callWithRetry,
  provinceFrom,
  cityCnNameFrom,
} = require('./util/worker_helper');


const config = require('./config');
const fetch = require('./fetch');
const JZFeedWorker = require('./index');

describe('Test City Utility', () => {
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
    const enName = cityEnNameFrom('乌鲁木齐');

    expect(enName.length).not.toBe(0);
    expect(enName).toBe('wulumuqi');
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
  
});

describe('Test JZFeedWorker', () => {
  connect();

  test('should get initial date range: 2020-02-01/2020-02-28', async () => {
    const city = cityFrom('肇庆');
    const w = new JZFeedWorker(city);
    const { from, to } = await w.getMonthRange();
    expect(from).toBe('2020-02-01');
    expect(to).toBe('2020-02-29');
  });

  test('should get test month range: 2020-11-11/2020-11-12', async () => {
    const jieyang = cityFrom('揭阳');
    const w = new JZFeedWorker(jieyang);
    const { from, to } = await w.getMonthRange();
    expect(from).toBe('2020-11-12');
    expect(to).toBe('2020-11-30');
  });

  test('should get test date: 2020-11-12', async () => {
    const jieyang = cityFrom('揭阳');
    const w = new JZFeedWorker(jieyang);
    const nextDay = await w.getNextDay();
    expect(nextDay).toBe('2020-11-12');
  });

  test('fetch weather api should return raw data', async () => {
    const testCity = cityFrom('北京');
    const w = new JZFeedWorker(testCity);
    const nextDay = await w.getNextDay();
    const rawData = await w.fetchRawDataFromWeather({ 
      from: nextDay, to: nextDay 
    });

    expect(rawData.length).not.toBe(0);
  });

  test('should get feeds from weather raw data', () => {
    const mockData = [{
      "elenum":1,
      "week":"星期三",
      "addTime":"2020-03-11",
      "city":"北京",
      "level":"偏高",
      "cityCode":"beijing",
      "num":202.00,
      "eletype":"花粉",
      "content":"敏感人群减少外出，外出需防护。"
    }];

    const testCity = cityFrom('北京');
    const w = new JZFeedWorker(testCity);
    const feeds = w.feedsFromWeatherRaw(mockData);

    expect(feeds.length).not.toBe(0);
    
    const [{cityId, pollenCount, releaseDate, region}] = feeds;
    expect(cityId).toBe(testCity.id);
    expect(releaseDate).toBe(dayjs('2020-03-11').startOf('day').valueOf());
    expect(region.provinceId).toBe(provinceFrom(testCity).id);
    expect(pollenCount).toBe('202');

    const mockData2 = [{
      "elenum":1,
      "week":"星期三",
      "addTime":"2020-03-11",
      "city":"北京",
      "level":"偏高",
      "cityCode":"beijing",
      "num": '',
      "eletype":"花粉",
      "content":"敏感人群减少外出，外出需防护。"
    }];

    const afeeds = w.feedsFromWeatherRaw(mockData);
    expect(afeeds.pollenCount).toBe('202');

  })
  
});
