#!/usr/bin/env node

const { cryptoWaitReady, mnemonicGenerate } = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');
const util = require('util');
var argv = require('minimist')(process.argv.slice(2));
var colors = require('colors');

const nameFormat = argv["name"] ?? "EVAN CLAIM %i";
const iOffset = argv["offset"] ?? 1;
const quantity = argv["quantity"] ?? 1;

console.info(`Generating ${colors.yellow(quantity)} accounts with format ${colors.italic(nameFormat)} and offset ${colors.yellow(iOffset)}\n`)

async function main() {
    // we only need to do this once per app, somewhere in our init code
    // (when using the API and waiting on `isReady` this is done automatically)
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' }); // Constuct the keyring after the API (crypto has an async init)

    var data = [];
    var addresses = [];
    i = iOffset;
    while (i < iOffset + quantity) {
        // generate a mnemonic with default params (we can pass the number
        // of words required 12, 15, 18, 21 or 24, less than 12 words, while
        // valid, is not supported since it is more-easily crackable)
        const mnemonic = mnemonicGenerate();

        // create & add the pair to the keyring with the type and some additional
        // metadata specified
        const pair = keyring.addFromUri(mnemonic, { name: util.format(nameFormat, i) }, 'sr25519');

        data.push(`\t  { "name": "${pair.meta.name}", "address": "${pair.address}", "phrase": "${mnemonic}" }`);
        addresses.push(`"${pair.address}", # ${pair.meta.name}`);
        i += 1;
    }

    // log the name & address (the latter encoded with the ss58Format)
    console.info(colors.bold('data.json:\n'));
    console.log(data.join(',\n'));
    console.info(colors.bold('\n\n\nclaimCaps.ps1:\n'));
    console.log(addresses.join('\n'));
}
main().catch(console.error).finally(() => process.exit());