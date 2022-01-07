const config = {
  logLevel: 'error',
  url: ' ',
  openWeatherApi: '',
  openWeatherApiToken: 'token',
  params: {
    a: 'param',
  },
  awsRegion: 'ap-east-1',
  bucketName: 'you_bucket_name',
  fileKeyNameSurfix: 'your_s3_file_name.json',
  weatherUrl: ' ',
  weatherCitys: [
    {
      code: 'beijing', en: 'beijing', cn: '北京', weatherid: '1816670',
    },
  ],
  specificRegions: [
    {
      code: 'saihanqu',
      en: 'saihanqu',
      cn: '赛罕区',
      url: 'https://google.com',
    },
  ],
};

export default config;
