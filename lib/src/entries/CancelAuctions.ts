import { DBExecution } from "../system/execution/DatabaseExecution";
import { Execution } from "../system/execution/Execution";
import * as yahoo from "../executions/website/yahoo/Yahoo";
import { Db } from "typeorm";
import { syncAccounts } from "../executions/apps/Sync";

export function execution() {
    return Execution.transaction("Application", "CancelAuctions")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(session => DBExecution.yahoo(rep => rep.getExhibitAIDs(username)).map(aids => ({ session, aids })))
                .then(val => Execution.sequence(val.aids, 10)
                    .element(aid => yahoo.cancelAuction(val.session, aid)))
            )
        );
}

async function run() {
    await syncAccounts().execute();
    await execution().execute();
    process.exit();
}

run();