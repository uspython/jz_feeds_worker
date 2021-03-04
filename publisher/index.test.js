import Publisher from '.';
import config from '../worker/config';
import { cityFrom } from '../worker/util/worker_helper';
import {
  connect,
  disconnect,
} from '../worker/util/dbhelper';

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

  const testCity = cityFrom('包头');
  const publisher = new Publisher(testCity, testBucket);

  test('should return buckets', async () => {
    const b = await publisher.listBuckets();

    expect(b.length).not.toBe(0);
  });

  test('should get pollen json in latest 7 days', async () => {
    const j = await publisher.getRawJson();

    expect(j.length).not.toBe(0);
  });

  test("should upload city's json file to s3 with gzip", async () => {
    const run = async () => {
      const status = await publisher.uploadJson();
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
