const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const WeatherFeedSchema = new Schema({
  coord: {
    lon: {
      type: 'Number',
    },
    lat: {
      type: 'Number',
    },
  },
  weather: {
    type: [
      'Mixed',
    ],
  },
  base: {
    type: 'String',
  },
  main: {
    temp: {
      type: 'Number',
    },
    feels_like: {
      type: 'Number',
    },
    temp_min: {
      type: 'Number',
    },
    temp_max: {
      type: 'Number',
    },
    pressure: {
      type: 'Number',
    },
    humidity: {
      type: 'Number',
    },
  },
  visibility: {
    type: 'Number',
  },
  wind: {
    speed: {
      type: 'Number',
    },
    deg: {
      type: 'Number',
    },
  },
  clouds: {
    all: {
      type: 'Number',
    },
  },
  dt: {
    type: 'Number',
    index: true,
  },
  sys: {
    type: {
      type: 'Number',
    },
    id: {
      type: 'Number',
    },
    message: {
      type: 'Number',
    },
    country: {
      type: 'String',
    },
    sunrise: {
      type: 'Number',
    },
    sunset: {
      type: 'Number',
    },
  },
  timezone: {
    type: 'Number',
  },
  id: {
    type: 'Number',
    index: true,
  },
  name: {
    type: 'String',
  },
  cod: {
    type: 'Number',
  },
}, {
  timestamps: {
    createdAt: 'createdAt',
    updateAt: 'updateAt',
  },
});

const WeatherFeed = model('WeatherFeed', WeatherFeedSchema);
// Feed.ensureIndexes();
module.exports = WeatherFeed;
