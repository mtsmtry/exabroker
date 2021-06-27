import {syncAccounts, syncDeals, removeClosedAuction} from "../executions/apps/Sync";
import { dealMessage } from "../executions/apps/DealImage";


async function run() {
    await syncAccounts().execute();
    await syncDeals().execute();

    // 1円画像の取引・評価
    await dealMessage.execute();

    await removeClosedAuction();
}

run();
