import config from '../config';
import fetch from '.';

async function fetchData(callback) {
  const response = await fetch(
    'GET',
    config.url,
    null,
    {
      ...config.params,
    },
  );

  callback(response);
}
test('request beijing api, expect data is not EMPTY', async (done) => {
  function callback(response) {
    try {
      const { status, statusText } = response;

      expect(status).toBe(200);
      expect(statusText).toBe('OK');
      done();
    } catch (error) {
      done(error);
    }
  }

  fetchData(callback);
});
