const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const validateConfig = require("../utils/validateConfig").validateConfig;

const tokenValidator = (prefix, variable) => (value) => {
    const pass = value.match(new RegExp(`^${prefix}[\\d\\w]{32}$`));
    if (pass) return true;

    return `Wrong ${variable}, key scheme: ${prefix}XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`;
};

const questions = [
    {
        type: "input",
        name: "APP_ID",
        message: `Paste here a virgil ${chalk.magenta("APPLICATION ID")}
you can create app: https://dashboard.virgilsecurity.com/ \n>`,
    },
    {
        type: "input",
        name: "API_KEY",
        message: `Paste here a virgil ${chalk.magenta("API KEY")}
you can create api key here: https://dashboard.virgilsecurity.com/api-keys/ \n>`,
    },
    {
        type: "input",
        name: "API_KEY_ID",
        message: `Paste here a virgil ${chalk.magenta("KEY ID")}
you can copy api key here: https://dashboard.virgilsecurity.com/api-keys/ \n>`,
    },
    {
        type: "input",
        name: "TWILIO_ACCOUNT_SID",
        message: `Paste here a twilio ${chalk.magenta("ACCOUNT SID")} (string that starts with "AC")
you can find it on: https://www.twilio.com/console \n>`,
        validate: tokenValidator("AC", "account SID")
    },
    {
        type: "input",
        name: "TWILIO_API_SECRET",
        message: `Paste here a twilio Api ${chalk.magenta("SECRET")}.
1. Open https://www.twilio.com/console/chat/runtime/api-keys/create
2. Input friendly name and select 'Standard' key
3. Paste SECRET \n>`,
        validate: value => (value.length === 32 ? true : "API SECRET have 32 symbols length")
    },
    {
        type: "input",
        name: "TWILIO_API_KEY",
        message: `Paste here a twilio Api Key ${chalk.magenta(
            "SID"
        )}. (string that starts with "SK") \n>`,
        validate: tokenValidator("SK", "Api Key SID")
    },
    {
        type: "input",
        name: "TWILIO_SERVICE_SID",
        message: `Paste here a twilio Service ${chalk.magenta(
            "SID"
        )} (string that starts with "IS").
You need to create service here
https://www.twilio.com/console/chat/dashboard \n>`,
        validate: tokenValidator("IS", "Service SID")
    }
];

const configPath = path.join(process.cwd(), "config.json");

if (!fs.existsSync(configPath)) {
    const configExamplePath = path.join(process.cwd(), "config.example.json");
    fs.copyFileSync(configExamplePath, configPath);
}

let config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const missingParams = validateConfig(config);

const missingParamsQuestions = missingParams.reduce((arr, param) => {
    arr.push(questions.find(q => q.name === param));
    return arr;
}, []);

console.log(`Hello, there ${missingParamsQuestions.length} steps left to complete configuration`);

inquirer.prompt(missingParamsQuestions).then(answers => {
    const newConfig = JSON.stringify(Object.assign(config, answers), null, 4);
    fs.writeFileSync(configPath, newConfig);
    exec('npm run compile', () => require("./server"));
});
