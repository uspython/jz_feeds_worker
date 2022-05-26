const protobuf = require('protobufjs');

async function toProtoBuf(doc) {
  const root = await protobuf.load(`${__dirname}/pollen.prod.proto`);
  const PollenResponse = root.lookupType('pollenflyer.PollenResponse');
  console.info(`doc${JSON.stringify(doc)}`);
  console.info(`Verify: ${PollenResponse.verify(doc)}`);

  const buf = PollenResponse.encode(doc).finish();
  return buf;
}

module.exports = toProtoBuf;
