const protobuf = require('protobufjs');

async function pollenToProtoBuf(doc) {
  let buffer = null;
  const root = await protobuf.load(`${__dirname}/pollen.prod.json`);
  const PollenResponse = root.lookupType('pollenflyer.PollenResponse');
  buffer = PollenResponse.encode(doc).finish();

  if (process.env.NODE_ENV === 'development') {
    // console.log(`json = ${JSON.stringify(doc)}`);
    // console.log(`buffer = ${Array.prototype.toString.call(buffer)}`);
    // const decoded = PollenResponse.decode(buffer);
    // console.log(`decoded = ${JSON.stringify(decoded)}`);
  }

  return buffer;
}

async function configToProtoBuf(doc) {
  let buffer = null;
  const root = await protobuf.load(`${__dirname}/config.prod.json`);
  const resp = root.lookupType('pollenflyer.ConfigResponse');
  buffer = resp.encode(doc).finish();

  if (process.env.NODE_ENV === 'development') {
    // console.log(`json = ${JSON.stringify(doc)}`);
    // console.log(`buffer = ${Array.prototype.toString.call(buffer)}`);
    // const decoded = PollenResponse.decode(buffer);
    // console.log(`decoded = ${JSON.stringify(decoded)}`);
  }

  return buffer;
}

/// Decode to Json
async function decodePollenProtoBuf(buffer) {
  const root = await protobuf.load(`${__dirname}/pollen.prod.json`);
  const PollenResponse = root.lookupType('pollenflyer.PollenResponse');
  const decoded = PollenResponse.decode(buffer);

  return decoded;
}

async function decodeConfigProtoBuf(buffer) {
  const root = await protobuf.load(`${__dirname}/config.prod.json`);
  const resp = root.lookupType('pollenflyer.ConfigResponse');
  const decoded = resp.decode(buffer);

  return decoded;
}

module.exports = {
  pollenToProtoBuf, decodePollenProtoBuf, configToProtoBuf, decodeConfigProtoBuf,
};
