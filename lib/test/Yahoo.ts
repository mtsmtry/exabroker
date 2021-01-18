import { exhibitAmazonAuction } from "../src/executions/integration/ExhibitAmazonAuction";
import * as yahoo from "../src/executions/yahoo/Yahoo";
import { createContainerMaintainer } from "../src/Index";
import { Execution } from "../src/system/execution/Execution";

async function main() {
    const exec = Execution.transaction({})
        .then(val => yahoo.getSession("hbbqy62195"))
        .then(val => exhibitAmazonAuction(val, "B073JYC4XM"));
    await exec.execute();
}

main();