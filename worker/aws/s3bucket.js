const AWS = require('aws-sdk');

const credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
const myConfig = new AWS.Config({
  credentials,
  region: 'us-west-1',
});

console.log(JSON.stringify(AWS.config.region));
//console.log(JSON.stringify(AWS.config.region));
// test('should get aws config', () => {
//   console.log(JSON.stringify(AWS.config));
//   expect(AWS.config).not.toBeNull();
//   expect(AWS.config.region).toBe('us-west-1');

//   var credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
//   AWS.config.credentials = credentials;

//   expect(credentials).not.toBeNull();
// });
