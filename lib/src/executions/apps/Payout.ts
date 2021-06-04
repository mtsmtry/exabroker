import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import * as yahoo from "../website/yahoo/Yahoo";
import * as amazon from "../website/amazon/Amazon";

export function payout() {
    return Execution.transaction("Application", "Payout")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => yahoo.payout(val))
            )
        );
}