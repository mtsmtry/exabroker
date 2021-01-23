import { exhibitAmazonAuction } from "../src/executions/integration/ExhibitAmazonAuction";
import * as yahoo from "../src/executions/web/yahoo/Yahoo";
import * as yahooDriver from "../src/executions/web/yahoo/YahooDriver";
import { createContainerMaintainer } from "../src/Index";
import { Execution } from "../src/system/execution/Execution";

async function main() {
    const exec = Execution.transaction({})
        .then(val => yahoo.getSession("hbbqy62195"))
        .then(val => yahoo.syncSoldAuctions(val));
    console.log(await exec.execute());
}

main();
