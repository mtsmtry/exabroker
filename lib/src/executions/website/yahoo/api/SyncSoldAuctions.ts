import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function syncSoldAuctions(session: YahooSession) {
    return Execution.transaction("Yahoo", getCurrentFilename())
        .then(val => {
            return yahooDriver.getSoldAIDs(session.cookie);
        })
        .then(val =>
            Execution.sequence(val, 10)
                .element(aid => Execution.transaction()
                    .then(() => yahooDriver.getSoldAuction(aid, session.account.username, session.cookie))
                    .then(val => DBExecution.yahoo(rep => rep.upsertDeal(val)))
                )
        );
}