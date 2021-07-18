import { Execution } from "../system/execution/Execution";
import { getCurrentFilename } from "../Utils";
import { message } from "../executions/apps/Message";
import { order } from "../executions/apps/Order";
import { payout } from "../executions/apps/Payout";
import { syncAccounts, syncDeals, syncNotices, syncOrders } from "../executions/apps/Sync";
import { dealImage } from "../executions/apps/DealImage";
import { exhibitImage } from "../executions/apps/ExhibitImage";
import { exhibitQoo10 } from "../executions/apps/ExhibitQoo10";

function support() {
    return Execution.transaction("Application", getCurrentFilename())
       // .then(val => payout())
       // .then(val => syncAccounts())
       // .then(val => syncNotices())
       // .then(val => syncDeals())
       // .then(val => syncOrders())
     //   .then(val => dealImage())
       // .then(val => message())
        .then(val => exhibitQoo10());
       // .then(val => dealImage());
}

async function run() {
    await support().execute();
    process.exit();
}

run();