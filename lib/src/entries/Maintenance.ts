import { syncNotices } from "../executions/apps/Sync";

async function run() {
    await syncNotices().execute();
}

run();