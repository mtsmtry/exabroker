import { YahooAccount } from "../../../../entities/YahooAccount";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import * as yahooDriver from "../YahooDriver";

export class YahooSession {
    cookie: Cookie;
    account: YahooAccount;
}

export function getSession(username: string): Execution<YahooSession> {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => DBExecution.yahoo(rep => rep.getAccount(username)))
        .then(val => {
            if (!val) {
                throw `${username} is not found`;
            }
            return Execution.resolve(val);
        })
        .then(account => {
            if (!account.cookies) {
                return Execution.transaction(account)
                    .then(val => yahooDriver.login(username, val.password))
                    .then(val => DBExecution.yahoo(rep => rep.saveCookies(username, val))
                        .map(_ => ({ cookie: val, account })));
            } else {
                return Execution.resolve({ cookie: account.cookies, account });
            }
        })
}