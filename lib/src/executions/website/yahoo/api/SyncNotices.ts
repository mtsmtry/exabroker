import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function syncNotices(session: YahooSession) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => {
            return yahooDriver.getNotices(session.cookie);
        })
        .then(val => {
            if (val.length == 0) {
                return Execution.cancel(); 
            }
            return Execution.batch()
                .and(() => DBExecution.yahoo(rep => {
                    return rep.saveNotices(session.account.username, val);
                }))
                .and(() => {
                    return yahooDriver.removeNotices(session.cookie, val.map(x => x.code))
                })
        });
}