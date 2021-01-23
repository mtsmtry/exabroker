import * as yahooDriver from "../YahooDriver";
import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { YahooSession } from "./GetSession";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function syncSoldAuctions(session: YahooSession) {
    return Execution.transaction(arguments, "Yahoo", getCurrentFilename())
        .then(val => {
            return yahooDriver.getSoldAIDs(session.cookie);
        })
        .then(val =>
            Execution.sequence(val, 10)
                .element(val => Execution.transaction(val)
                    .then(val => yahooDriver.getSoldAuction(val, session.account.username, session.cookie))
                    .then(val => DBExecution.yahoo(rep => rep.upsertSoldAuction(val)))
                )
        );
}