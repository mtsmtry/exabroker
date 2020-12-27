import { createDatabaseConnection } from "../src/Factory";
import { AuctionData, YahooAuctionClient, AccountInfo } from "../src/api/YahooAuction";
import { YahooRepository } from "../src/repositories/YahooRepository";
import { AuctionSort, Prefecture, ShipSchedule } from "../src/api/drivers/YahooAuctionDriver";
import { randomString } from "../src/Utils";

async function main() {
    const conn = await createDatabaseConnection();
    const yahooRep = new YahooRepository(conn.manager);
    const yahoo = new YahooAuctionClient(yahooRep);
    await yahoo.login("hbbqy62195");


    const info: AccountInfo = {
        nameSei: "松本",
        nameMei: "太郎",
        nameSeiKana: "マツモト",
        nameMeiKana: "タロウ",
        phone: "08098360712",
        zip: "2520804",
        prefecture: "神奈川県",
        city: "藤沢市",
        address1: "湘南台2-7-20",
        address2: "Vivant 702",
        ccNumber: "4619 3592 2682 9450",
        ccExpMonth: 12,
        ccExpYear: 2025,
        ccCVV: 997
    }
   // await yahoo.setupAccount(info);
   // await yahoo.driver.deleteWallet();


    
    //await yahoo.driver.buyAuction("o448259146", 1);
    //const detail = await yahoo.driver.getAuction("o448259146");
   // await yahoo.driver.startAuction("o448259146", detail.sellerId, yahoo.account.username);
    await yahoo.driver.payAuction("j702408661", "997", 0);
    return;
    await yahoo.driver.startAuction("l644489484", "ggfjx64291", "smzys96536");

    return;
    await yahoo.driver.buyAuction("l644489484", 1);

    return;
    return;
    //yahoo.driver.buyAuction("")
    //console.log(await yahoo.driver.searchAution("相互評価 画像", AuctionSort["おすすめ順"]));

    return;

   // console.log((await yahoo.driver.client.get("https://auctions.yahooapis.jp/AuctionWebService/V2/myCloseList")).text);
    console.log(await yahoo.driver.getCategory("PS4"));

    const notices = await yahoo.getNotices();
    console.log(notices);

    return;
    const auction: AuctionData = {
        title: `古代ギリシアの暮らし ${randomString(5)}`,
        price: 9999999,
        description: "商品説明",
        days: 6,
        closingHours: 23,
        shipSchedule: ShipSchedule["1～2日で発送"],
        shipName: "Amazon FBA",
        prefecture: Prefecture["東京都"],
        images: ["https://images-na.ssl-images-amazon.com/images/I/61qkGgv9sBL._SX385_BO1,204,203,200_.jpg"]
    };
    const aid = await yahoo.exhibitAuction(auction);
    await yahoo.cancelAuction(aid);
}

main();