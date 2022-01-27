/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-plusplus */

import {
    ConnectContactFlowEvent,
    ConnectContactFlowCallback,
    Context,
    ConnectContactFlowResult,
} from 'aws-lambda';

const aws = require('aws-sdk');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const seedRandom = require('seedrandom');
const vanityWordList = require('word-list');

const generateVanityNumbers = async (number: string) => {
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
    let vanityWord = numberArray // Constructs a word by randomly selecting one of the three letters for each corresponding number on the dial pad
        .map((digit) => {
            return dialPad.get(digit).charAt(Math.floor(Math.random() * 3));
        })
        .join();

    let vanityNumberList: string[];

    for (let i = 0; i < 5; i++) {
        while (vanityWord.length <= 10) {
            // Generates a random decimal less than 1 using the previous word as a seed, then multiplies by the size of the word to pull a word at the result index
            vanityWord = vanityWordList[Math.floor(seedRandom(vanityWord) * vanityWordList.length)];
        }

        const digitsToAdd = 10 - vanityWord.length;
        let vanityNumberArray: string[];

        if (digitsToAdd !== 0) {
            // If vanity word is not 10 characters, generate random digits to prepend to vanity word to make vanity number 10 characters
            for (let j = 0; j < digitsToAdd; j++) {
                vanityNumberArray.push(Math.floor(Math.random() * 10).toString());
            }

            vanityNumberArray.push(vanityWord);
        }

        vanityNumberList.push(vanityNumberArray.join());
    }

    return vanityNumberList;
};

aws.config.update({ region: 'us-west-2' });

export const handler = async (
    event: ConnectContactFlowEvent,
    // eslint-disable-next-line no-unused-vars
    context: Context,
    callback: ConnectContactFlowCallback
) => {
    const documentClient = new aws.DynamoDB.DocumentClient({ region: 'us-west-2' });

    try {
        const rawCallerNumber = event.Details.ContactData.CustomerEndpoint.Address; // Get caller number from Connect event

        if (!phoneUtil.isValidNumber(rawCallerNumber)) {
            throw Error('Invalid phone number!');
        }

        const formattedCallerNumber = phoneUtil
            .parseAndKeepRawInput(rawCallerNumber, 'US')
            .getNationalNumber(); // Parse US number into libphonenumber object and format to national number (e.g. 1234567890)

        const getParams = {
            TableName: 'VanityNumbers',
            Key: {
                phoneNumber: formattedCallerNumber,
            },
        };

        const vanityNumberList = await documentClient.get(getParams).promise();
        console.log(vanityNumberList);

        const generatedVanityNumbers =
            vanityNumberList || (await generateVanityNumbers(formattedCallerNumber));

        const putParams: any = {
            TableName: 'VanityNumbers',
            Item: {
                phoneNumber: formattedCallerNumber,
                vanityNumbers: generatedVanityNumbers,
            },
            ConditionExpression: 'attribute_not_exists(phoneNumber)',
            ReturnConsumedCapacity: 'TOTAL',
        };

        await documentClient.put(putParams).promise();

        const vanityNumbersToReturn = generatedVanityNumbers.slice(0, 3);

        const connectContactFlowResult: ConnectContactFlowResult = {};

        for (let i = 0; i < vanityNumbersToReturn.length; i++) {
            connectContactFlowResult[`number${i}`] = vanityNumbersToReturn[i];
        }

        callback(null, connectContactFlowResult);
    } catch (error) {
        console.log(error);
    }
};
