const AWS = require('aws-sdk');

test('should get aws config', () => {
  expect(AWS.config.credentials.profile).toBe('default');
});
