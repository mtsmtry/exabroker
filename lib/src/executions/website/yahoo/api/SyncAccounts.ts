import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function syncAccounts(session: YahooSession) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => yahooDriver.getAccountStatus(session.account.username, session.cookie))
        .then(val => DBExecution.yahoo(rep => rep.updateAccountStatus(session.account.username, val)));
}