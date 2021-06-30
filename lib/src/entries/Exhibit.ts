import { exhibit } from "../executions/apps/Exhibit";
import { exhibitImage } from "../executions/apps/ExhibitImage";
import { syncAccounts } from "../executions/apps/Sync";

async function run() {
    await syncAccounts().execute();
    await exhibit().execute();
    process.exit();
    
}

run();
