import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../system/execution/Execution";
import { getCurrentFilename } from "../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../system/execution/DatabaseExecution";

export function syncNotices(session: YahooSession) {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => {
            return yahooDriver.getNotices(session.cookie);
        })
        .then(val => 
            Execution.batch(val)
            .and(val => DBExecution.yahoo(rep => {
                return rep.saveNotices(session.account.username, val);
            }))
            .and(val => {
                return yahooDriver.removeNotices(session.cookie, val.map(x => x.code))
            })
        );
}