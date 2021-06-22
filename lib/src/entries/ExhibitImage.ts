import {exhibitImage} from "../executions/apps/ExhibitImage";
import { syncAccounts } from "../executions/apps/Sync";


async function run() {
    console.log("Exhibit Image: START");
    await syncAccounts().execute();
    await exhibitImage().execute();
}

run();
