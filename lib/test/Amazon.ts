import { exhibitAmazonAuction } from "../src/executions/integration/ExhibitAmazonAuction";
import * as amazonDriver from "../src/executions/web/amazon/AmazonDriver";
import { createContainerMaintainer } from "../src/Index";
import { Execution } from "../src/system/execution/Execution";
import { PurchaseAddress } from "../src/executions/web/amazon/commands/Purchase";

const address: PurchaseAddress = {
    fullName: "テスト太郎",
    postalCode1: "791",
    postalCode2: "8011",
    stateOrRegion: "愛媛県",
    addressLine1: "松山市",
    addressLine2: "西長戸町",
    addressLine3: "7-1",
    phoneNumber: "08098360612"
};

async function main() {
    const exec = Execution.transaction({})
        .then(val => amazonDriver.login("dragon77shopping@gmail.com", "ryoui21280712"))
        .then(val => amazonDriver.purchase("B087CHMKR4", address, val));
    console.log(await exec.execute());
}

main();
