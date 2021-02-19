const dayjs = require('dayjs');
const {
  connect,
  addFeed,
  queryCityFeeds,
} = require('./util/dbhelper');

const config = require('./config');
const fetch = require('./fetch');

const {
  cityEnNameFrom, cityFrom, callbackFromWeather, JZFeedWorker,
} = require('./index');

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

  test("should reture city's english name", () => {
    const enName = cityEnNameFrom('乌鲁木齐');

    expect(enName.length).not.toBe(0);
    expect(enName).toBe('wulumuqi');
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

  test('fetch weather api should reture 1', async () => {
    const testCity = cityFrom('北京');
    const w = new JZFeedWorker(testCity);
    const nextDay = await w.getNextDay();
    const fetchStatus = await w.fetchFromWeather({ from: nextDay, to: nextDay });

    expect(fetchStatus).not.toBe(0);
  });
});
