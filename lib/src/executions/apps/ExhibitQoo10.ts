import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { exhibitAmazonAuction } from "../integration/ExhibitAmazonAuction";
import { exhibitAmazonQoo10 } from "../integration/ExhibitAmazonQoo10";
import * as yahoo from "../website/yahoo/Yahoo";
import { removeClosedAuction } from "./Sync";

export function exhibitQoo10() {
    return Execution.transaction("Application", getCurrentFilename())
        .then(val => DBExecution.qoo10(rep => rep.getAccounts()))
        .then(val => Execution.sequence(val, 1)
            .element(account => Execution.transaction()
                .then(val => DBExecution.qoo10(rep => rep.getExhibitCount(account.userId)))
                .then(exhibitCount => DBExecution.integration(rep => rep.getQoo10ExhibitableASINs(5000 - exhibitCount)).map(val => ({ asins: val })))
                .then(val => Execution.sequence(val.asins, 30)
                    .element(asin => exhibitAmazonQoo10(account, asin))
                )
            )
        );
}