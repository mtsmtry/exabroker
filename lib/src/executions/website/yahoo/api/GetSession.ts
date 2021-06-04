import { YahooAccount } from "../../../../entities/website/YahooAccount";
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
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => DBExecution.yahoo(rep => rep.getAccount(username)).mustBeNotNull())
        .then(account => {
            let loginDays: number | null = null;
            if (account.loggedinAt) {
                const millseconds = Date.now() - account.loggedinAt.getTime();
                loginDays = millseconds / 1000.0 / 3600.0 / 24.0;
            }
            if (!account.cookies || (loginDays && loginDays > 20)) {
                return Execution.transaction()
                    .then(val => yahooDriver.login(username, account.password))
                    .then(val => DBExecution.yahoo(rep => rep.saveCookies(username, val))
                        .map(_ => ({ cookie: val, account })));
            } else {
                return Execution.resolve({ cookie: account.cookies, account });
            }
        })
}