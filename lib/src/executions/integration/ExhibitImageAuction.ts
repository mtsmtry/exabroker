import { exhibitAuction, AuctionExhibit, YahooSession } from "../website/yahoo/Yahoo";
import { Prefecture, ShipSchedule } from "../website/yahoo/YahooDriver";
import * as fs from 'fs';
import { IntegrationRepository } from "../../repositories/IntegrationRepository";
import { random } from "../../Utils";


export function exhibitImageAuction(session: YahooSession, imageId: number) {
    // 画像を出品するプログラム

    const description = `当商品をご覧いただき、ありがとうございます。
落札後は商品画像を右クリックしていただき、ダウンロードしてお使いください。現物の発送は対応しておりません。

1アカウントにつき、1度のみの落札となります。複数回・複数商品の落札はご遠慮頂ますよう、よろしくお願いします。

■お取引の流れ
 
①落札後、Yahoo!かんたん決済にてお支払い（落札者様）
②発送連絡（出品者）※ 現物の発送はございません
③受取連絡 +「非常に良い」の評価（落札者様）
④上記の確認が出来次第「非常に良い」評価入力（出品者）
    `
    let filename = 'yahooimageauction_images/' + imageId.toString() + '.jpg';
    let buf: Buffer = fs.readFileSync(filename);

    let auction: AuctionExhibit = {
        images: [buf],
        title: "相互 フリー画像データ 即決1円 " + imageId.toString(),
        price: 1,
        description: description,
        days: 10,
        closingHours: random(0, 23),
        shipSchedule: ShipSchedule["1～2日で発送"],
        shipName: "DL",
        prefecture: Prefecture.三重県,
    }
    return exhibitAuction(session, auction);
}
