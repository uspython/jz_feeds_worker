const dayjs = require('dayjs');
const {
  connect,
  disconnect,
  alterFeed,
} = require('./util/dbhelper');
const {
  cityFrom,
  callbackFromWeather,
  callbackFromMinifluxApi,
  provinceFrom,
  WeatherDefaultDate,
  randomizeArray,
  countryFrom,
  getCityCodeWith,
  searchFromCountry,
  regionFromWeather,
  regionFromId,
  remoteConfigJson,
  aliasFromRegion,
  getRssFeedConfig,
} = require('./util/worker_helper');
const config = require('./config');

const JZFeedWorker = require('./index');
const JZMiniFluxWorker = require('./miniflux/index');

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
    expect(testCity.pinyin).toBe(undefined);
  });

  test('should return Xian', () => {
    const testCity = cityFrom('西安');

    expect(testCity.province).toBe('陕西省');
    expect(testCity.name).toBe('西安市');
    expect(testCity.id).toBe('610100000000');
    expect(testCity.pinyin).toBe('xian');
  });

  test('should return Zibo', () => {
    const testCity = cityFrom('淄博');

    expect(testCity.province).toBe('山东省');
    expect(testCity.name).toBe('淄博市');
    expect(testCity.pinyin).toBe('zibo');
  });

  test("should return city's english name", () => {
    const testCity = cityFrom('乌鲁木齐');

    expect(testCity.pinyin).toBe('urumqi');
  });

  test("should return city's english code", () => {
    const code = getCityCodeWith('承德');

    expect(code.length).not.toBe(0);
    expect(code).toBe('chegnde');
  });

  test('should return a provice', () => {
    const testCity = cityFrom('沈阳');
    const p = provinceFrom(testCity);

    expect(p.name).toBe('辽宁省');
    expect(p.id).toBe('210000000000');
    expect(p.pinyin).toBe('liaoning');
  });

  test('should return a country', () => {
    // 321323000000
    const testCity = cityFrom('宿迁');
    const country = countryFrom(testCity, '321323000000');

    expect(country).not.toBeNull();
    expect(country.id).toBe('321323000000');
    expect(country.name).toBe('泗阳县');
    expect(country.pinyin).toBe('siyang');
  });

  test('should search country from countryMap', () => {
    const country = searchFromCountry('乌兰浩特');
    expect(country).not.toBeNull();
    expect(country.city).toBe('兴安盟');
    expect(country.pinyin).toBe('ulanhot');
  });

  test('should get region with id', () => {
    const e = {
      // 内蒙古呼和浩特赛罕区
      provinceId: '150000000000',
      cityId: '150100000000',
      countryId: '150105000000',
      lat: '40.79839423697477',
      lng: '111.70842064450414',
    };

    const region = regionFromId(e.provinceId, e.cityId, e.countryId);
    const fileName = aliasFromRegion(region);

    expect(region.province.name).toBe('内蒙古');
    expect(region.city.name).toBe('呼和浩特市');
    expect(region.country.name).toBe('赛罕区');
    expect(fileName).toBe('innermongolia_hohhot_saihan');

    expect(region.coord.lat).toBe(e.lat);
    expect(region.coord.lng).toBe(e.lng);
  });

  test('should get region with id', () => {
    const e = {
      // 北京市
      provinceId: '110000000000',
      cityId: '110100000000',
      countryId: '110100000000',
      lat: '39.910924547299565',
      lng: '116.4133836971231',

    };
    const region = regionFromId(e.provinceId, e.cityId, e.countryId);
    const fileName = aliasFromRegion(region);

    expect(region.province.name).toBe('北京市');
    expect(region.city.name).toBe('市辖区');
    expect(region.country.name).toBe('市辖区');
    expect(fileName).toBe('beijing');

    expect(region.coord.lat).toBe(e.lat);
    expect(region.coord.lng).toBe(e.lng);
  });

  test('should get config region', () => {
    const { data: { config: { regions } } } = remoteConfigJson();

    // console.log(JSON.stringify(citys));

    expect(regions.length).toBe(config.weatherCitys.length + config.uploadCities.length);

    for (let index = 0; index < config.weatherCitys.length; index += 1) {
      const weatherCity = config.weatherCitys[index];
      const region = regions[index];

      // console.log(aliasFromRegion(region));

      const regionName = `${region.province.name}${region.city.name}${region.country.name}`;
      const regionPinyin = `${region.province.pinyin}${region.city.pinyin || ''}${region.country.pinyin || ''}`;
      if (regionPinyin.indexOf(weatherCity.en) < 0) {
        console.log(regionPinyin, weatherCity);
      }
      expect(regionName.indexOf(weatherCity.cn)).toBeGreaterThanOrEqual(0);
      expect(regionPinyin.indexOf(weatherCity.en)).toBeGreaterThanOrEqual(0);
      expect(region.coord).not.toBeNull();
    }

    for (let index = config.weatherCitys.length; index < regions.length; index += 1) {
      const uploadCity = config.uploadCities[index - config.weatherCitys.length];
      const region = regions[index];
      // console.log(aliasFromRegion(region));

      expect(region.city.id).toBe(uploadCity.cityId);
      expect(region.coord).not.toBeNull();
    }
  });

  test('should get region with city name', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('宿迁');
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

    expect(coord.lat).toBe('33.96774971569008');
    expect(coord.lng).toBe('118.28157403570837');
  });

  test('should get region with city name 西宁', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('西宁');
    const testCity = cityFrom('西宁');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('青海省');
    expect(coord.lat).toBe('36.62338469651661');
    expect(coord.lng).toBe('101.78445017050855');
  });

  test('should get region with city name 重庆', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('重庆');
    const testCity = cityFrom('重庆');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('重庆市');
    expect(coord.lat).toBe('29.568996245338923');
    expect(coord.lng).toBe('106.55843415537664');
  });

  test('should get region with city name 沧州', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('沧州');
    const testCity = cityFrom('沧州');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('河北省');
    expect(coord.lat).toBe('38.310215141107044');
    expect(coord.lng).toBe('116.84558075595014');
  });

  test('should get region with city name 石家庄', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('石家庄');
    const testCity = cityFrom('石家庄');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);
    expect(province.name).toBe('河北省');
    expect(coord.lat).toBe('38.052097109846855');
    expect(coord.lng).toBe('114.46902163264978');
  });

  test('should get region with city name 武汉', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('武汉');
    const testCity = cityFrom('武汉');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('湖北省');
    expect(coord.lat).toBe('30.598466736400987');
    expect(coord.lng).toBe('114.31158155473231');
  });

  test('should get region with city name 伊犁', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('伊犁');
    const testCity = cityFrom('伊犁');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('新疆');
    expect(coord.lat).toBe('43.92272313749215');
    expect(coord.lng).toBe('81.3305377475322');
  });

  test('should get region with city name 昆明', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('昆明');
    const testCity = cityFrom('昆明');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('云南省');
    expect(coord.lat).toBe('24.873998150044006');
    expect(coord.lng).toBe('102.85244836500482');
  });

  test('should get region with city name 西宁', () => {
    const {
      province, city, country, coord,
    } = regionFromWeather('西宁');
    const testCity = cityFrom('西宁');
    const testProvince = provinceFrom(testCity);

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe(testCity.id);
    expect(city.name).toBe(testCity.name);
    expect(city.id).toBe(testCity.id);
    expect(province.name).toBe(testProvince.name);
    expect(province.id).toBe(testProvince.id);

    expect(province.name).toBe('青海省');
    expect(coord.lat).toBe('36.62338469651661');
    expect(coord.lng).toBe('101.78445017050855');
  });

  test('should get region with country name 1', () => {
    const region = regionFromWeather('乌兰浩特');
    const {
      province, city, country, coord,
    } = region;

    expect(province).not.toBeNull();
    expect(city).not.toBeNull();
    expect(country).not.toBeNull();

    expect(country.id).toBe('152201000000');
    expect(country.city).toBe('兴安盟');
    expect(city.name).toBe('兴安盟');
    expect(province.id).toBe('150000000000');

    const fileName = aliasFromRegion(region);
    expect(fileName).toBe('innermongolia_xingan_ulanhot');

    expect(coord.lat).toBe('46.07865434358189');
    expect(coord.lng).toBe('122.099622351983');
  });

  test('should get region with country name 2', () => {
    const { province, city, country } = regionFromWeather('泗阳');

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
      const r = regionFromWeather(cn);

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
    const region = regionFromWeather('肇庆');
    const w = new JZFeedWorker(region);
    const { from, to } = await w.getMonthRange();
    expect(from).toBe(WeatherDefaultDate);
    expect(to).toBe(dayjs(WeatherDefaultDate).endOf('month').format('YYYY-MM-DD'));
  });

  test('should get test month range: 2020-11-11/2020-11-12', () => {
    expect(async () => {
      const jieyang = regionFromWeather('揭阳');
      const w = new JZFeedWorker(jieyang);
      const { from, to } = await w.getMonthRange();
      expect(from).toBe('2020-11-12');
      expect(to).toBe('2020-11-30');
    }).not.toThrowError();
  });

  test('month range should before (NOW + 1Day)', async () => {
    const testRegion = regionFromWeather('烟台');
    console.log('[testRegion] ', JSON.stringify(testRegion));
    const today = dayjs().startOf('day').add(8, 'hours');

    const newFeed = {
      cityId: testRegion.city.id,
      region: {
        provinceId: testRegion.province.id,
        countryId: testRegion.country.id,
      },
      releaseDate: today.valueOf(),
      pollenCount: '489',
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
    const jieyang = regionFromWeather('揭阳');
    const w = new JZFeedWorker(jieyang);
    const { from, to } = await w.getNextDayRange();
    expect(from).toBe('2020-11-12');
    expect(to).toBe('2020-11-12');
  });

  test('fetch weather api should return raw data', async () => {
    const testCity = regionFromWeather('北京');
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
      addTime: '2022-06-11',
      city: '北京',
      level: '偏高',
      cityCode: 'beijing',
      num: 202.00,
      eletype: '花粉',
      content: '敏感人群减少外出，外出需防护。',
    }];

    const testRegion = regionFromWeather('北京');
    const w = new JZFeedWorker(testRegion);
    const feeds = w.feedsFromWeatherRaw(mockData);

    expect(feeds.length).not.toBe(0);

    const [{
      cityId, pollenCount, releaseDate, region,
    }] = feeds;

    expect(cityId).toBe(testRegion.city.id);
    expect(releaseDate).toBe(dayjs('2022-06-11').startOf('day').add(8, 'hours').valueOf());
    expect(region.provinceId).toBe(testRegion.province.id);
    expect(pollenCount).toBe('202');
  });

  test('should get a datalist object with regex', () => {
    const resp = 'callback({"dataList":[{"elenum":1,"week":"星期日","addTime":"2022-03-01","city":"","level":"","cityCode":"","num":"","eletype":"花粉","content":""}]})';

    const r = callbackFromWeather(resp);
    expect(r).not.toBeNull();
    expect(r.length).not.toBe(0);

    const { dataList } = r;
    expect(dataList.length).not.toBe(0);
  });

  test('should get a datalist object with RSS regex', () => {
    const resp = {"total":15,"entries":[{"id":10,"user_id":1,"feed_id":1,"status":"read","hash":"2922b6ecae6604b1532f6f261e9248f516ec657b14ef6771a209e5f418a7e8d3","title":"【榆林花粉浓度日报】7月21日","url":"http://www.test.me/t/tqHIwT7YKd","comments_url":"","published_at":"2022-07-21T11:02:00Z","created_at":"2022-07-25T07:18:18.667335Z","content":"间：7月21日</p><p>花粉数量：（35粒/千平方毫米）</p><p>f3baa3de8829f031727962744&amp;chksm=97165725a061de33f72ffb92f3734194c9d6b65002ee581b02c36e8f0b4be74087f869dd59c3#rd\" rel=\"noopener noreferrer\" target=\"_blank\" referrerpolicy=\"no-referrer\">文章原文</a>\n        <br>\n    \n\n    \n\n    <img alt=\"\" src=\"http://www.d\" loading=\"lazy\">\n\n","author":"test.me (test.me)","share_code":"","starred":false,"reading_time":3,"enclosures":null,"feed":{"id":1,"user_id":1,"feed_url":"http://www.test.me/rss/GI2TCNZVG56DONZSHE4GMNBWGM3TQZBWMRTDONDBGMYGEZRWGFRGIYRWGA3TQNTGMI4WMMJSMZRQ====","site_url":"http://www.test.me/column/63hPuA1SIU","title":"test.me - test.me啥","checked_at":"2022-07-27T01:58:18.092146Z","next_check_at":"0001-01-01T00:00:00Z","etag_header":"","last_modified_header":"","parsing_error_message":"","parsing_error_count":0,"scraper_rules":"","rewrite_rules":"","crawler":false,"blocklist_rules":"","keeplist_rules":"","user_agent":"","username":"","password":"","disabled":false,"ignore_http_cache":false,"allow_self_signed_certificates":false,"fetch_via_proxy":false,"category":{"id":1,"title":"All","user_id":1},"icon":{"feed_id":1,"icon_id":1}}}]};
    const { rssCities: [{ regex }] } = config;
    const r = callbackFromMinifluxApi(resp, regex);
    expect(r).not.toBeNull();
    expect(r.length).not.toBe(0);
  });

  test('should get RSS Config City', () => {
    const city = getRssFeedConfig('陕西省榆林市');
    const { feedName } = city;
    expect(city).not.toBeNull();
    expect(feedName).toBe('榆林');
  });

  test('fetch miniflux api should return raw data', async () => {
    const testCity = regionFromWeather('榆林');
    const w = new JZMiniFluxWorker(testCity);
    const rawData = await w.fetchRawDataFromMinifluxApi({ from: null, to: null });

    expect(rawData.length).not.toBe(0);
  });

  test('fetch miniflux api should return today raw data', async () => {
    const testCity = regionFromWeather('榆林');
    const w = new JZMiniFluxWorker(testCity);
    const nextDay = await w.getNextDayRange();

    let from = null;
    if (nextDay.from === WeatherDefaultDate && nextDay.to === WeatherDefaultDate) {
      // Nothing
    } else {
      from = dayjs()
        .utc()
        .startOf('day')
        .add(-1, 'day')
        .unix();
    }

    const rawData = await w.fetchRawDataFromMinifluxApi({ from });

    expect(rawData.length).toBeGreaterThanOrEqual(1);
  });
});
