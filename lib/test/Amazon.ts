import { exhibitAmazonAuction } from "../src/executions/integration/ExhibitAmazonAuction";
import * as amazonDriver from "../src/executions/website/amazon/AmazonDriver";
import * as amazon from "../src/executions/website/amazon/Amazon";
import * as yahoo from "../src/executions/website/yahoo/Yahoo";
import { createContainerMaintainer } from "../src/Index";
import { Execution } from "../src/system/execution/Execution";
import { getRepositories } from "../src/system/Database";
import { DeliveryAddress } from "../src/entities/website/AmazonOrder";
import { order } from "../src/executions/apps/Order";
import { getWideLength } from "../src/executions/integration/Utils";

const address: DeliveryAddress = {
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
    //const session = await amazon.getSession("dragon77shopping@gmail.com").execute();
    //await amazonDriver.deleteAddresses(session.cookie).execute();
    console.log(await order().execute());
}

main();