import { dealImage } from "../executions/apps/DealImage";
import { exhibitImage } from "../executions/apps/ExhibitImage";
import { message } from "../executions/apps/Message";
import { order } from "../executions/apps/Order";
import { syncAccounts, syncDeals, syncNotices, syncOrders } from "../executions/apps/Sync";
import { Execution } from "../system/execution/Execution";
import { getCurrentFilename } from "../Utils";

function maintenance() {
    return Execution.transaction("Application", getCurrentFilename())
        //.then(val => payout())
        .then(val => syncAccounts())
        .then(val => syncNotices())
        .then(val => syncDeals())
        .then(val => syncOrders())
        .then(val => order())
        .then(val => message())
        .then(val => exhibitImage())
        .then(val => dealImage());
}

async function run() {
    await maintenance().execute();
    process.exit();
}

run();