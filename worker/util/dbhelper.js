const mongoose = require('mongoose');
const logger = require('../logger');

function connect() {
  logger.info(`mongo url: ${process.env.MONGO_URL}`);
  mongoose.connect(`${process.env.MONGO_URL}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    user: `${process.env.ME_CONFIG_MONGODB_ADMINUSERNAME}`,
    pass: `${process.env.ME_CONFIG_MONGODB_ADMINPASSWORD}`,
  }, (err) => {
    logger.error({ err });
  });

  const { connection } = mongoose;
  connection.once('open', () => {
    // we're connected!
    logger.info("we're connected!");
  });
}

module.exports = connect;
