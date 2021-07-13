import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { exhibitAmazonAuction } from "../integration/ExhibitAmazonAuction";
import { orderAuction } from "../integration/OrderAuction";
import { AmazonSession } from "../website/amazon/Amazon";
import * as amazon from "../website/amazon/Amazon";
import * as amazonDriver from "../website/amazon/AmazonDriver";
import * as yahoo from "../website/yahoo/Yahoo";
import { AuctionDealStatus } from "../../entities/website/YahooAuctionDeal";

function orderWithSession(amazonSession: AmazonSession) {
    return Execution.transaction()
        .then(val => DBExecution.integration(rep => rep.getMustOrderArbs()))
        .then(val => Execution.sequence(val, 1)
            .element(val => orderAuction(val, amazonSession))
        )
        .then(val => amazonDriver.deleteAddresses(amazonSession.cookie));
}

export function order() {
    return Execution.transaction("Application", "Order")
        .then(val => amazon.getSession("dragon77shopping@gmail.com"))
        .then(val => orderWithSession(val));
}