import {
  addFeed,
  alterFeed,
  deleteFeed,
  queryCityFeeds,
} from './dbhelper';

test('request beijing api, expect data is not EMPTY', async () => {
  try {
    const results = await queryCityFeeds({ cityId: '11010010102' });

    const [{ cityId }] = results;

    expect(results.length).not.toBe(0);
    expect(cityId).toBe('11010010102');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
});
