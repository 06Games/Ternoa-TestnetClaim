#!/usr/bin/env node

// Import the API, Keyring and some utility functions
const { Keyring } = require('@polkadot/keyring');

// Custom modules
const utils = require('./utils');

// Transfer
const DATA = require('./data.json');
const MIN_QTE = 1000;
const KEEP = 5;

async function main() {
    const api = utils.connectToApi();
    const keyring = new Keyring({ type: 'sr25519' }); // Construct the keyring after the API (crypto has an async init)

    for (const {transferName, receiverAddress, senders} of DATA.transfers) {
        console.log(`\n\n--------------- ${transferName.name} (${receiverAddress}) ---------------`);

        for (const sender of senders) {
            if (sender.phrase == null) {
                utils.error(`${sender.name} (${sender.address}): No passphrase`);
                continue;
            }

            const account = keyring.addFromUri(sender.phrase);// Add an account, straight mnemonic

            if (account.address !== sender.address) {
                utils.error(`${sender.name}: Passphrase ${account.address} ≠ ${sender.address}`);
                continue;
            }

            // We make sure the account has a sufficient amount of CAPS
            const available = await utils.getAvailableCAPS(api, account.address);
            if (available < MIN_QTE) {
                utils.warning(`${sender.name} (${account.address}): Insufficient balance (${available} CAPS / ${MIN_QTE} CAPS)`);
                continue;
            }

            // Create an extrinsic, transferring TRANSFER_QTE units to RECEIVER
            const transferQTE = available - KEEP;
            const transfer = api.tx.balances.transferKeepAlive(receiverAddress, utils.convertFromDecimalCAPS(transferQTE));
            const hash = await transfer.signAndSend(account); // Sign and send the transaction using the account
            utils.success(`${sender.name} (${account.address}): Sent ${transferQTE} CAPS with hash ${hash.toHex()}`);
        }
    }
}

main().catch(console.error).finally(() => process.exit());