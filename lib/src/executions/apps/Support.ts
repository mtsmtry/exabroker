import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { message } from "./Message";
import { order } from "./Order";
import { payout } from "./Payout";
import { syncAccounts, syncDeals, syncNotices, syncOrders } from "./Sync";

export function support() {
    return Execution.transaction("Application", getCurrentFilename())
        .then(val => payout())
        .then(val => syncAccounts())
        .then(val => syncNotices())
        .then(val => syncDeals())
        .then(val => syncOrders())
        .then(val => order())
        .then(val => message());
}