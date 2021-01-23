import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { exhibitAmazonAuction } from "../integration/ExhibitAmazonAuction";
import * as yahoo from "../web/yahoo/Yahoo";

export function exhibiter() {
    return Execution.transaction({}, "Application", "Exhibit")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(["hbbqy62195"], 1)
            .element(val => Execution.transaction(val)
                .then(username => DBExecution.yahoo(rep => rep.getExhibitCount(username)).map(exhibitCount => ({ exhibitCount, username })))
                .then(val => Execution.batch(val)
                    .and(val => yahoo.getSession(val.username).map(val => ({ session: val })))
                    .and(val => DBExecution.amazon(rep => rep.getExhibitableASINs(3000 - val.exhibitCount)).map(val => ({ asins: val })))
                )
                .then(val => Execution.sequence(val.asins, 10)
                    .element(asin => exhibitAmazonAuction(val.session, asin))
                )
            )
        );
}