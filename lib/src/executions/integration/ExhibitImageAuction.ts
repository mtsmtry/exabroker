import { exhibitAuction, AuctionExhibit, YahooSession } from "../website/yahoo/Yahoo";
import { Prefecture, ShipSchedule } from "../website/yahoo/YahooDriver";
import * as fs from 'fs';
import { IntegrationRepository } from "../../repositories/IntegrationRepository";
import { getCurrentFilename, random } from "../../Utils";
import { Execution } from "../../system/execution/Execution";
import { DBExecution } from "../../system/execution/DatabaseExecution";

export function exhibitImageAuction(session: YahooSession, imageName: string) {
    return Execution.transaction("Integration", getCurrentFilename())
        .then(_ => {
            // 画像を出品するプログラム
        
            const description = `当商品をご覧いただき、ありがとうございます。
        画像の受け渡しは、画像データのURLの送信にて行わせていただきます。
        1アカウントにつき、1度のみの落札となります。複数回・複数商品の落札はご遠慮頂ますよう、よろしくお願いします。
        
        ■お取引の流れ
        ①落札後、Yahoo!かんたん決済にてお支払い（落札者様）
        ②発送連絡（出品者）※ 現物の発送はございません
        ③受取連絡 +「非常に良い」の評価（落札者様）
        ④上記の確認が出来次第「非常に良い」評価入力（出品者）
            `.replace(/\n/g, "<br>");

            let filename = 'images/' + imageName + '.jpg';
            let buf: Buffer = fs.readFileSync(filename);

            let auction: AuctionExhibit = {
                images: [buf],
                title: "【相互評価】画像データ URL 即決1円 " + imageName,
                price: 1,
                description: description,
                days: 4, // 最大出品日数は7日
                closingHours: random(0, 23),
                shipSchedule: ShipSchedule["1～2日で発送"],
                shipName: "ダウンロード",
                prefecture: Prefecture["東京都"],
                categoryId: 2084022812
            }
            return exhibitAuction(session, auction);
        })
        .then(aid => DBExecution.integration(rep => rep.createImageAuction(aid, imageName)));
}
