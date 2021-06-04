import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { messageAuction } from "../integration/MessageAuction";
import { AmazonSession } from "../website/amazon/Amazon";
import * as yahoo from "../website/yahoo/Yahoo";
import * as amazon from "../website/amazon/Amazon";
import { getCurrentFilename } from "../../Utils";

export function message() {
    return Execution.transaction("Application", getCurrentFilename())
        .then(_ => DBExecution.integration(rep => rep.createAllSoldArb()))
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(_ => yahoo.getSession(username))
                .then(session => Execution.transaction()
                    .then(session => DBExecution.integration(rep => rep.getSoldArbsByUsername(username)))
                    .then(solds => Execution.sequence(solds, 5)
                        .element(sold => messageAuction(sold, session))
                    )
                )
            )
        );
}