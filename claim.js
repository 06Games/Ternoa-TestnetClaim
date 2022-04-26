#!/usr/bin/env node

// Import some utility functions
const {Keyring} = require('@polkadot/keyring');
const axios = require('axios');
const {addDays, addMilliseconds, format} = require('date-and-time');
const fs = require('fs');

// Custom modules
const utils = require('./utils');

// Params
const NETWORK = "alphanet";
const DATA = require(`./data-${NETWORK}.json`);
const DATE_PATH = './date.txt';


/**************************
 *         Script         *
 **************************/

function Network() {
    if (NETWORK === "testnet") return utils.testnet;
    else if (NETWORK === "alphanet") return utils.alphanet;
    else if (NETWORK === "mainnet") throw new Error(`Mainnet isn't supported by this tool`);
    else throw new Error(`Network type ${NETWORK} isn't valid`);
}

const minute = 60 * 1000;
const delay = 24 * 60 * minute + minute; // Every day and one minute (every 24h01)

async function claimAll() {
    const currentDate = new Date();
    const rateDelay = 60; // 60 min
    for (const {senders} of DATA.transfers) {
        for (const sender of senders) {
            if (!sender.claim) {
                utils.info(`Ignoring ${sender.name}`);
                continue;
            }
            utils.info(`Processing ${sender.name}`);

            if (sender.phrase == null) utils.warning(`${sender.name} (${sender.address}): No passphrase`);
            await sendClaimRequest(sender);

            utils.info(`Waiting ${rateDelay} min`);
            await new Promise(resolve => setTimeout(resolve, rateDelay * minute));
        }
    }

    fs.writeFileSync(DATE_PATH, currentDate.toISOString());
    utils.info(`Next claim at ${addMilliseconds(currentDate, delay)}`);
}

function sendClaimRequest(sender) {
    return axios.get(Network().ClaimAPI(sender.address), utils.httpOptions)
        .then(_ => {
            utils.success(formatLog(sender, `Success`));
        })
        .catch(err => {
            let msg = err;
            if (err?.response?.data?.errors) msg += ` (${err.response.data.errors.map(e => e.message).join(", ")})`;
            else if (err?.response?.data) msg += ` (${err.response.data})`;
            utils.error(formatLog(sender, msg));
        });
}

//TODO: Call this fct
async function transferCAPS(api, sender, receiverAddress) {
    const keyring = new Keyring({type: 'sr25519'}); // Construct the keyring after the API (crypto has an async init)
    const account = keyring.addFromUri(sender.phrase);// Add an account, straight mnemonic
    if (account.address !== sender.address) {
        utils.error(`${sender.name}: Passphrase ${account.address} ≠ ${sender.address}`);
        return;
    }

    // We make sure the account has a sufficient amount of CAPS
    const available = await utils.getAvailableCAPS(api, account.address);
    if (available < Network().MIN_QTE) {
        utils.warning(`${sender.name} (${account.address}): Insufficient balance (${available} CAPS / ${Network().MIN_QTE} CAPS)`);
        return;
    }

    // Create an extrinsic, transferring TRANSFER_QTE units to RECEIVER
    const transferQTE = available - Network().KEEP;
    const transfer = api.tx.balances.transferKeepAlive(receiverAddress, utils.convertFromDecimalCAPS(transferQTE));
    const hash = await transfer.signAndSend(account); // Sign and send the transaction using the account
    utils.success(`${sender.name} (${account.address}): Sent ${transferQTE} CAPS with hash ${hash.toHex()}`);
}

function formatLog(sender, message) {
    return `${sender.name} (${sender.address}): ${message}`;
}

function main() {
    claimAll().catch(console.error);
    setInterval(claimAll, delay); // From now on the function will be called every $delay
}


let date = fs.existsSync(DATE_PATH) ? new Date(fs.readFileSync(DATE_PATH, 'utf8')) : new Date(1970, 0);
if (new Date() > addDays(date, 1)) main();
else {
    let nextClaim = addDays(date, 1) - new Date();
    utils.info(`Waiting ${format(new Date(nextClaim), 'HH:mm:ss')} before starting claiming`)
    setTimeout(main, nextClaim);
}
