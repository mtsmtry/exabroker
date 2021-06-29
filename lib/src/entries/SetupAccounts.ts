import { DBExecution } from "../system/execution/DatabaseExecution";
import { Execution } from "../system/execution/Execution";
import * as yahoo from "../executions/website/yahoo/Yahoo";
import * as yahooDriver from "../executions/website/yahoo/YahooDriver";
import * as amazon from "../executions/website/amazon/Amazon";
import { getRepositories } from "../system/Database";
import { AccountSettingInfo } from "../executions/website/yahoo/Yahoo";

let accounts: ({ username: string, password: string } & AccountSettingInfo)[] = []
try {
    accounts = require(`../../../accounts.json`);
} catch(ex) {
    accounts = require(`../../accounts.json`);
}
let accountDict: { (n: string): AccountSettingInfo } = {} as any;
accounts.forEach(account => {
    accountDict[account.username] = account;
});

async function addAccount() {
    const reps = await getRepositories();
    const usernames = await reps.yahoo.getAccountUsernames();
    const usernameDict = {};
    usernames.forEach(username => {
        usernameDict[username] = true;
    });
    for(const account of accounts) {
        if (!usernameDict[account.username]) {
            await reps.yahoo.createAccount(account.username, account.password);
        }
    }
}

function setupAccounts() {
    return Execution.transaction("Entry", "SetupAccounts")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(usernames => Execution.sequence(usernames, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => yahoo.setupAccount(val, accountDict[username], val.account.password)
            )
        ));
}

async function run() {
    await addAccount();
    await setupAccounts().execute();
}

run();