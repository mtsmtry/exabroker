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
                    .then(val => 
                        Execution.batch()
                            .and(_ => DBExecution.yahoo(rep => rep.upsertDeal(val)))
                            .and(_ => DBExecution.yahoo(rep => rep.setExhibitActuallyEndDate(val.aid, val.endDate)))
                    )
                )
        );
}