"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws = require('aws-sdk');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const seedRandom = require('seedrandom');
const vanityWordList = require('word-list');
const generateVanityNumbers = async (number) => {
    const dialPad = new Map([
        ['0', 'ABC'],
        ['1', 'DEF'],
        ['2', 'GHI'],
        ['3', 'JKL'],
        ['4', 'MNO'],
        ['5', 'PQR'],
        ['6', 'STU'],
        ['7', 'VWX'],
        ['8', 'YZA'],
        ['9', 'BCD'],
    ]);
    const numberArray = number.split('');
    const numberAsWord = numberArray
        .map((digit) => {
        return dialPad.get(digit).charAt(Math.floor(Math.random() * 3));
    })
        .join();
    for (let i = 0, i; ; )
        ;
};
aws.config.update({ region: 'us-west-2' });
const handler = async (event, context) => {
    const documentClient = new aws.DynamoDB.DocumentClient({ region: 'us-west-2' });
    try {
        const rawCallerNumber = event.Details.ContactData.CustomerEndpoint.Address; // Get caller number from Connect event
        if (!phoneUtil.isValidNumber(rawCallerNumber)) {
            throw Error('Invalid phone number!');
        }
        const formattedCallerNumber = phoneUtil
            .parseAndKeepRawInput(rawCallerNumber, 'US')
            .getNationalNumber(); // Parse US number into libphonenumber object and format to national number (e.g. 1234567890)
        const params = {
            TableName: 'VanityNumbers',
            Key: {
                phoneNumber: formattedCallerNumber,
            },
        };
        const vanityNumberList = await documentClient.get(params).promise();
        console.log(vanityNumberList);
        const generatedVanityNumbers = vanityNumberList || (await generateVanityNumbers(formattedCallerNumber));
    }
    catch (error) {
        console.log(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=convertNumberToVanity.js.map