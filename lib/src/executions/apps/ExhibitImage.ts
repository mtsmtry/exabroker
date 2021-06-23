
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { exhibitAmazonAuction } from "../integration/ExhibitAmazonAuction";
import * as yahoo from "../website/yahoo/Yahoo";
import { removeClosedAuction } from "./Sync";
import { IntegrationRepository } from "../../repositories/IntegrationRepository";
import { exhibitImageAuction } from "../integration/ExhibitImageAuction";

// export function exhibitimage_() {
//     return Execution.transaction("Application", getCurrentFilename())  // 実行のカテゴリ: アプリ。 gCF: 実行の名前。ファイル名。
//         .then(val => DBExecution.yahoo(rep => rep.getExhibitableAccountUsernames()))  // yahooというstatic関数 repはYahooに関するDBにアクセスができるオブジェクト。 出品可能なアカウントのユーザー名を全部取得
//         .then(val => Execution.sequence(val, 1)  // アカウントの名前の配列がval. sequenceは最大同時実行数を指定して、配列の中からn分とりだしてelementの中で実行
//             .element(username => Execution.transaction()
//                 .then(_ => DBExecution.yahoo(rep => rep.getExhibitCount(username)).map(exhibitCount => ({ exhibitCount, username })))  // getExCount: ユーザーアカウントで出品している数
//                 .then(val => Execution.batch()  // 以下のand2つを非同期で実行
//                     .and(() => yahoo.getSession(val.username).map(val => ({ session: val }))) // getSession ユーザー名を打ち込むと、ログインしてセッションを返す(Cookieとか)
//                     .and(() => DBExecution.integration(rep => rep.getExhibitableASINs(3000 - val.exhibitCount)).map(val => ({ asins: val })))  // integ: yahooとかAmazonを統合したテーブル 出品可能なAmazon商品IDを  最後
//                 )
//                 .then(val => Execution.sequence(val.asins, 10)
//                     .element(asin => exhibitAmazonAuction(val.session, asin))  // 1-個ずつ出品
//                 )
//             )
//         );
// }


// これを、画像を出品するように編集する
// DBのテーブル作って、ちゃんと画像出品してるかチェックしながらやっていく

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
}


export function exhibitImage() {
    return Execution.transaction("Application", getCurrentFilename())  // 実行のカテゴリ: アプリ。 gCF: 実行の名前。ファイル名。
        .then(val => DBExecution.yahoo(rep => rep.getExhibitableAccountUsernames()))  // yahooというstatic関数 repはYahooに関するDBにアクセスができるオブジェクト。 出品可能なアカウントのユーザー名を全部取得
        .then(val => Execution.sequence(val, 1)  // アカウントの名前の配列がval. sequenceは最大同時実行数を指定して、配列の中からn分とりだしてelementの中で実行
            .element(username => Execution.transaction()
                .then(_ => DBExecution.integration(rep => rep.getImageAuctionExhibitCount(username)).map(imageExhibitCount => ({ imageExhibitCount, username })))
                .then(val => yahoo.getSession(val.username).map(s => ({ session: s, username: val.username, imageExhibitCount: val.imageExhibitCount })))
                .then(val => Execution.sequence([...Array(10 - val.imageExhibitCount)], 1)
                    .element(_ => exhibitImageAuction(val.session, getRandomInt(0, 9)))
                )
            )
        );
}
