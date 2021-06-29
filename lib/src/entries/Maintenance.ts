import { dealImage } from "../executions/apps/DealImage";
import { exhibitImage } from "../executions/apps/ExhibitImage";
import { syncAccounts, syncDeals, syncNotices } from "../executions/apps/Sync";

async function run() {
    await syncNotices().execute();
    await syncAccounts().execute();
    await exhibitImage().execute();
    await syncDeals().execute();
    await dealImage().execute();
}

run();