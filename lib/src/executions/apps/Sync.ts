import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import * as yahoo from "../website/yahoo/Yahoo";
import * as yahooDriver from "../website/yahoo/YahooDriver";
import * as amazon from "../website/amazon/Amazon";
import { reviseAuction } from "../integration/ReviseAuction";

export function syncAccounts() {
    return Execution.transaction("Application", "SyncAccounts")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 5)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => yahoo.syncAccounts(val))
            )
        );
}

export function syncNotices() {
    return Execution.transaction("Application", "SyncNotices")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 5)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => yahoo.syncNotices(val))
            )
        )
        .then(val => yahoo.cancelViolatedAuctions());
}

export function syncDeals() {
    return Execution.transaction("Application", "SyncDeals")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => yahoo.syncSoldAuctions(val))
            )
        );
}

export function syncOrders() {
    return Execution.transaction("Application", "SyncOrders")
        .then(val => amazon.getSession("dragon77shopping@gmail.com"))
        .then(val => amazon.syncOrders(val));
}

export function syncPrice() {
    return Execution.transaction("Application", "SyncPrice")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(val => reviseAuction(val))
            )
        );
}

export function removeClosedAuction() {
    return Execution.transaction("Application", "RemoveClosedAuction")
        .then(val => DBExecution.yahoo(rep => rep.getAccountUsernames()))
        .then(val => Execution.sequence(val, 1)
            .element(username => Execution.transaction()
                .then(val => yahoo.getSession(username))
                .then(session => Execution.transaction()
                    .then(val => yahooDriver.getClosedAuctionCount(session.cookie))
                    .then(val => Execution.sequence([...Array(val / 50 | 0)].map((_, i) => (i + 1) % 10), 10)
                        .element(val => yahooDriver.removeClosedAuctions(session.cookie, val))
                    )
                )
            )
        );
}