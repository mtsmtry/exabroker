import { AuctionDealStatus } from "../src/entities/website/YahooAuctionDeal";
import { exhibit } from "../src/executions/apps/Exhibit";
import { message } from "../src/executions/apps/Message";
import { order } from "../src/executions/apps/Order";
import { payout } from "../src/executions/apps/Payout";
import { support } from "../src/executions/apps/Support";
import { removeClosedAuction, setupAccounts, syncAccounts, syncDeals, syncNotices, syncOrders } from "../src/executions/apps/Sync";
import { exhibitAmazonAuction } from "../src/executions/integration/ExhibitAmazonAuction";
import * as yahoo from "../src/executions/website/yahoo/Yahoo";
import * as yahooDriver from "../src/executions/website/yahoo/YahooDriver";
import { createContainerMaintainer } from "../src/Index";
import { getRepositories } from "../src/system/Database";
import { DBExecution } from "../src/system/execution/DatabaseExecution";
import { Execution } from "../src/system/execution/Execution";

async function main() {
    //await syncOrder().execute();
    //const exec = Execution.transaction({})
    //    .then(val => yahoo.getSession("hbbqy62195"))
    //    .then(val => yahooDriver.sendMessage("k528222338", "ご落札ありがとうございます。発送までもうしばらくお待ちください。", val.cookie));
  
    console.log(await payout().execute());
    //const reps = await getRepositories();
    //console.log(await reps.integration.getExhibitableASINs(1000));
}

main();

