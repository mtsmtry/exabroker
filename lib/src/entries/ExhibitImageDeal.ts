import {syncAccounts, syncDeals, removeClosedAuction} from "../executions/apps/Sync";
import { dealImage } from "../executions/apps/DealImage";
import { searchAuctionHistory } from "../executions/website/yahoo/queries/SearchAuctionHistory";

async function run() {

    const result = await searchAuctionHistory("ps4").execute();
    console.log(result)
    const result2 = await searchAuctionHistory("ps4frewfrew").execute();
    console.log(result2)

    process.exit();
    /*
    await syncAccounts().execute();
    await syncDeals().execute();
    // 1円画像の取引・評価
    await dealImage().execute();
    */
}

run();
