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
                .then(_ => DBExecution.yahoo(rep => rep.getExhibitCount(username)).map(exhibitCount => ({ exhibitCount, username })))
                .then(val => Execution.batch()
                    .and(() => yahoo.getSession(val.username).map(val => ({ session: val })))
                    .and(() => DBExecution.integration(rep => rep.getExhibitableASINs(3000 - val.exhibitCount)).map(val => ({ asins: val })))
                )
                .then(val => Execution.sequence(val.asins, 30)
                    .element(asin => exhibitAmazonAuction(val.session, asin))
                )
            )
        );
}