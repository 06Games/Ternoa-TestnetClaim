const {WsProvider, ApiPromise} = require("@polkadot/api");
const colors = require("colors");

const DECIMALS = 18;

exports.connectToApi = async function(apiURL, spec){
    const provider = new WsProvider(apiURL); // Initialise the provider to connect to the local node
    const api = await ApiPromise.create({ provider, types: spec }); // Create the API and wait until ready

    // Retrieve the chain & node information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([ api.rpc.system.chain(), api.rpc.system.name(), api.rpc.system.version() ]);
    this.info(`You are connected to chain ${colors.italic(chain.toString())} using ${colors.grey(`${nodeName} v${nodeVersion}`)}`);

    return api;
}

exports.convertToDecimalCAPS = function (caps){ return parseInt(caps / 10 ** DECIMALS); }
exports.convertFromDecimalCAPS = function (caps) { return (caps).toString() + "0".repeat(DECIMALS) }
exports.getAvailableCAPS = async function (api, address){
    let { data: { free } } = await api.query.system.account(address);
    return this.convertToDecimalCAPS(free);
}

exports.error = function(msg) { console.error(colors.red(msg)); }
exports.warning = function(msg) { console.warn(colors.yellow(msg)); }
exports.success = function(msg) { console.log(colors.green(msg)); }
exports.info = function(msg) { console.info(colors.grey(msg)); }

exports.testnet =
    {
        SUBSTRATE_URL: 'wss://testnet.ternoa.com',
        SPEC: require("./spec-testnet.json"),
        MIN_QTE: 1000,
        MAX_QTE: 11000,
        KEEP: 5,
        ClaimAPI: function(address) { return `https://ternoa-api.testnet.ternoa.com/api/faucet/claim-test-caps/${address}`; }
    };
exports.alphanet =
    {
        SUBSTRATE_URL: 'wss://alphanet.ternoa.com',
        SPEC: require("./spec-alphanet.json"),
        MIN_QTE: 10,
        MAX_QTE: 100,
        KEEP: 5,
        ClaimAPI: function(address) { return `https://ternoa-api.alphanet.ternoa.dev/api/faucet/claim-test-caps/${address}`; }
    };
exports.httpOptions = {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'}};