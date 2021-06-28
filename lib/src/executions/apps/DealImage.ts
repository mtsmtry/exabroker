
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import * as yahoo from "../website/yahoo/Yahoo";
import { messageImageAuction } from "../integration/MessageAuction";
import { YahooAuctionDeal } from "../../entities/website/YahooAuctionDeal";


export function dealMessage() {
    return Execution.transaction("Application", getCurrentFilename())
        .then(val => DBExecution.yahoo(rep => rep.getExhibitableAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(_ => DBExecution.integration(rep => rep.getSoldImageAuctions(username)).map(images => ({ images, username })))
                .then(val => yahoo.getSession(val.username).map(s => ({session: s, username: val.username, images: val.images })))
                .then(val => Execution.sequence(val.images, 1)
                    .element(img => DBExecution.yahoo(rep => rep.getImageDeal(img.aid)
                        .then(function (deal) {
                            if (deal) {
                                return messageImageAuction(deal, val.session).execute()
                            } else {
                                Execution.resolve(null)
                            }
                        })
                    ))
                )
        ))
}
