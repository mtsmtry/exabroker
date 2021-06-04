
import { YahooAccount } from "../../../../entities/website/YahooAccount";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import * as amazonDriver from "../AmazonDriver";

export interface AmazonSession {
    cookie: Cookie;
    email: string;
}

export function getSession(email: string): Execution<AmazonSession> {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => DBExecution.amazon(rep => rep.getAccount(email)))
        .then(val => {
            if (!val) {
                throw `${email} is not found`;
            }
            return Execution.resolve(val);
        })
        .then(account => {
            if (!account.cookies) {
                return Execution.transaction()
                    .then(val => amazonDriver.login(email, account.password))
                    .then(val => DBExecution.amazon(rep => rep.saveCookies(email, val)).map(_ => ({ cookie: val, email })));
            } else {
                return Execution.resolve({ cookie: account.cookies, email });
            }
        });
}