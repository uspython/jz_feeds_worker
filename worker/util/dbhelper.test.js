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

test('Query City Feed', async () => {
  try {
    const results = await queryCityFeeds({ cityId: '11010010102' });

    const [{ cityId }] = results;

    expect(results.length).not.toBe(0);
    expect(cityId).toBe('11010010102');
  } catch (error) {
    // eslint-disable-next-line no-console
    expect(error).not.toMatch('error');
  }
});
