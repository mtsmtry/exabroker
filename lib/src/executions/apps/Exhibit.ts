import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { exhibitAmazonAuction } from "../integration/ExhibitAmazonAuction";
import * as yahoo from "../website/yahoo/Yahoo";
import { removeClosedAuction } from "./Sync";

export function exhibit() {
    return Execution.transaction("Application", getCurrentFilename())
        .then(val => removeClosedAuction())
        .then(val => DBExecution.yahoo(rep => rep.getExhibitableAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(_ => Execution.batch()
                    .and(val => DBExecution.yahoo(rep => rep.getExhibitCount(username)).map(exhibitCount => ({ exhibitCount, username })))
                    .and(val => DBExecution.yahoo(rep => rep.getAccount(username)).map(account => ({ account })))
                )
                .then(val => Execution.batch()
                    .and(() => yahoo.getSession(val.username).map(val => ({ session: val })))
                    .and(() => DBExecution.integration(rep => rep.getExhibitableASINs(val?.account?.rating && val.account.rating >= 5 ? 3000 - val.exhibitCount : 0)).map(val => ({ asins: val })))
                )
                .then(val => Execution.sequence(val.asins, 30)
                    .element(asin => exhibitAmazonAuction(val.session, asin))
                )
            )
        );
}