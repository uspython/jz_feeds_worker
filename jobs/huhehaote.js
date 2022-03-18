const JZHuhehaoteWorker = require('../worker/region_worker');
const logger = require('../worker/logger');
const { wait } = require('../worker/util/worker_helper');
const { connect, disconnect } = require('../worker/util/dbhelper');

async function invoke() {
  await wait(Math.floor(Math.random() * 30 * 1000));

  const w = new JZHuhehaoteWorker();
  const r = await w.invoke();
  logger.info(`[JZHuhehaoteWorker]: ${r} added`);
}

async function start() {
  try {
    await connect();
    await invoke();
    await disconnect();
    process.exit(0);
  } catch (err) {
    logger.error({ err });
    process.exit(0);
  }
}

start();
