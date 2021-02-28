const config = {
  logLevel: 'error',
  url: ' ',
  params: {
    a: 'param',
  },
  awsRegion: 'ap-east-1',
  bucketName: 'you_bucket_name',
  fileKeyNameSurfix: 'your_s3_file_name.json',
  weatherUrl: ' ',
  weatherCitys: [
    { code: 'beijing', en: 'beijing', cn: '北京' },
  ],
};

export default config;
