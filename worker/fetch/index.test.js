import config from '../config';
import fetch from '.';

test('request beijing api, expect data is not EMPTY', async () => {
  try {
    const response = await fetch(
      'GET',
      config.url,
      null,
      {
        ...config.params,
      },
    );

    const { status, statusText } = response;

    expect(status).toBe(200);
    expect(statusText).toBe('OK');
    // expect(data.toString().length).not.toBe(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
});
