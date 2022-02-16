#!/usr/bin/env node

// Import some utility functions
const {Keyring} = require('@polkadot/keyring');
const axios = require('axios');
const schedule = require('node-schedule');
const {addDays, addMinutes, addMilliseconds, format} = require('date-and-time');
const fs = require('fs');

// Custom modules
const utils = require('./utils');

// Transfer
const DATA = require('./data.json');
const MAX_QTE = 11000;
let httpOptions = {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0'}};
function API(address) {
    return `https://ternoa-api.testnet.ternoa.com/api/faucet/claim-test-caps/${address}`;
}
function PATH(address) {
    return `./data/${address}.txt`;
}

const minute = 60 * 1000;
const delay = 24 * 60 * minute + minute; // Every day and one minute (every 24h01)

async function claimAll() {
/*    const api = await utils.connectToApi();
    const keyring = new Keyring({type: 'sr25519'}); // Construct the keyring after the API (crypto has an async init)*/

    const currentDate = new Date();
    for (const {senders} of DATA.transfers) {
        for (const sender of senders) {
            if (!sender.claim) continue;
            if (sender.phrase == null) utils.warning(`${sender.name} (${sender.address}): No passphrase`);
            /*else {
                const account = keyring.addFromUri(sender.phrase); // Add an account, straight mnemonic
                if (account.address !== sender.address) {
                    utils.error(formatLog(sender, `Given passphrase isn't matching ${account.address}`));
                    continue;
                }

                const available = await utils.getAvailableCAPS(api, account.address);
                if (available > MAX_QTE) {
                    utils.warning(formatLog(sender, `Balance too high (${available} CAPS > ${MAX_QTE} CAPS)`));
                    continue;
                }
            }*/

            sendClaimRequest(sender);
        }
    }
    utils.info(`Next claim at ${addMilliseconds(currentDate, delay)}`);
}

function sendClaimRequest(sender) {
    axios.get(API(sender.address), httpOptions)
        .then(_ => {
            utils.success(formatLog(sender, `Success`));
            fs.writeFileSync(PATH(sender.address), new Date().toISOString());
        })
        .catch(err => {
            let msg = err;
            if (err?.response) msg += ` (${err.response.data.errors.map(e => e.message).join(", ")})`
            utils.error(formatLog(sender, msg));
        });
}

function formatLog(sender, message) {
    return `${sender.name} (${sender.address}): ${message}`;
}

claimAll().catch(console.error);
setInterval(claimAll, delay); // From now on the function will be called every $delay
