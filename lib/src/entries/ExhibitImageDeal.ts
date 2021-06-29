import {syncAccounts, syncDeals, removeClosedAuction} from "../executions/apps/Sync";
import { dealImage } from "../executions/apps/DealImage";

async function run() {
    await syncAccounts().execute();
    await syncDeals().execute();
    // 1円画像の取引・評価
    await dealImage().execute();
}

run();
