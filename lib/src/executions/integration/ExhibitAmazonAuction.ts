import { Connection } from "typeorm";
import { AmazonItemDetail } from "../../entities/AmazonItemDetail";
import { AmazonRepository } from "../../repositories/AmazonRepository";
import { YahooRepository } from "../../repositories/YahooRepository";
import { getCurrentFilename, notNull, random, randomPositiveInteger } from "../../Utils";
import * as stripHtml from "string-strip-html";
import * as normalizeWhitespace from "normalize-html-whitespace";
import * as fs from "fs";
import { Document } from "../../system/Document";
import { AuctionExhibit, exhibitAuction } from "../web/yahoo/api/ExhibitAuction";
import { Prefecture, ShipSchedule } from "../web/yahoo/YahooDriver";
import { YahooSession } from "../web/yahoo/api/GetSession";
import { Execution, LogType } from "../../system/execution/Execution";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { WebExecution } from "../../system/execution/WebExecution";
import { getLatestVersionAmazonItemDetail } from "../../collections/AmazonItemDetailCollection";

const MAX_TITLE_LENGTH = 65;

function getWideLength(str: string) {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        if ((chr >= 0x00 && chr < 0x81) ||
            (chr === 0xf8f0) ||
            (chr >= 0xff61 && chr < 0xffa0) ||
            (chr >= 0xf8f1 && chr < 0xf8f4)) {
            result += 1;
        } else {
            result += 2;
        }
    }
    return result;
};

function replaceDict(src: string, dict: { [n: string]: string }) {
    Object.keys(dict).forEach(key => {
        src = src.replace(new RegExp("\\" + key), dict[key]);
    })
    return src;
}

function normalizeTitle(title: string) {
    const replaces = {
        "「": "", "」": "", '""': "", ":": "：", "/": "", "\\": "",
        "?": "", "<": "", ">": "", "|": "", "&": "＆", ";": ""
    }
    if (getWideLength(title) > MAX_TITLE_LENGTH) {
        title = replaceDict(title, replaces);
    }
    if (getWideLength(title) > MAX_TITLE_LENGTH) {
        title = title.replace(/【.*?】/g, "").trim()
    }
    if (getWideLength(title) > MAX_TITLE_LENGTH) {
        title = title.replace(/「.*?」/g, "").trim()
    }
    if (getWideLength(title) > MAX_TITLE_LENGTH) {
        title = title.replace(/\(.*?\)/g, "").trim()
    }
    return title.slice(0, MAX_TITLE_LENGTH);
}

function createSection(name: string, content: string) {
    const font = "Helvetica Neue, Helvetica, Hiragino Sans, ヒラギノ角ゴ ProN W3, Hiragino Kaku Gothic ProN, メイリオ, Meiryo, sans-serif"
    const html = `<center><table border='0' cellspacing='1' cellpadding='10' bgcolor='#c0c0c0' width='600'>
    <tr><th bgcolor='#dbe8ff' align='left' height='10'>${name}</th></tr>
    <tr><td bgcolor='#FFFFFF' align='left'>${content}</td></tr></table></center><br>`
    return `<font face="${font}" size="2">${html}</font>`
}

function descriptionTitle(title: string) {
    return `<center><br><font size='3' color='#003ca9'><b>${title}</b></font><br></center>`
}

function descriptionDetails(details: (object | null)[]) {
    const dict = details.filter(notNull).reduce((x, m) => Object.assign(x, m), {});
    const rows = Object.keys(dict)
        .filter(x => !x.includes("カスタマーレビュー") && !x.includes("Amazon") && x != "ASIN" && x != "型番")
        .map(key => {
            return `◆${key}：${dict[key]}`;
        });
    if (rows.length == 0) {
        return "";
    }
    return createSection("基本情報", rows.join("<br>"));
}

function descriptionFeatureBullets(bullets: string[] | null) {
    if (!bullets || bullets.length == 0) {
        return "";
    }
    const content = bullets
        .filter(x => !x.includes("モデル番号を入力してください"))
        .map(x => `◆${x.replace(":", "：")}`)
        .join("<br>");
    return createSection("特徴", content);
}

function toRowsTable(html: string) {
    const transpose = a => a[0].map((_, c) => a.map(r => r[c]));
    const doc = new Document(html);
    const tables = doc.find("//table").map(table => {
        return table.find(".//tr").map(tr => tr.find(".//td|.//th"));
    });
    console.log(tables);
    return tables.map(table => {
        const elms = transpose(table) as Element[][];
        return elms.map(elm => {
            return elm.map(x => `<div>${x.innerHTML}</div>`).join();
        }).join();
    }).join();
}

function descriptionHtml(html: string | null) {
    if (!html) {
        return "";
    }
    const tags = ["style", "script", "noscript", "table"];
    const options = { onlyStripTags: tags, stripTogetherWithTheirContents: tags };
    let imgStartCount = 0, imgEndCount = 0;
    html = stripHtml(html, options).result
        .replace(/ src=/g, " data-dammy=")
        .replace(/ data-src=/g, " src=")
        .replace(/ (class|href|style|data-[a-z\-]+)=["'].*?["']/g, " ")
        .replace(/もっと読む/g, "")
        .replace(/<img /g, () => {
            imgStartCount++;
            if (imgStartCount > 10) {
                return "<div";
            } else {
                return "<img";
            }
        })
        .replace(/<\/img /g, () => {
            imgEndCount++;
            if (imgEndCount > 10) {
                return "</div";
            } else {
                return "</img";
            }
        });
    return createSection("商品説明", html + toRowsTable(html));
}

function descriptionRelated(username: string, categoryId: number) {
    const url = `https://auctions.yahoo.co.jp/seller/${username}?auccat=${categoryId}`
    const content = `色違いやバージョン違い、同じカテゴリーの商品などは<a href="${url}">こちら</a>をご覧ください。`
    return createSection("関連商品", content);
}

const desc1 = `■ Yahoo!かんたん決済`;

const desc2 = `・お支払いの確認後 1日から2日以内で、発送できるよう対応しております。
・提携業者倉庫やAmazonに配送と管理を委託しております。時と場合により、業者名入りの梱包で配送になる場合が御座います。予め、ご了承下さい。
・配送業者の指定、着払い または代引き.営業所止め.局留め.コンビニ受取.他の商品との同梱、領収証の発行には対応できません。
・ヤマト運輸.郵便局.その他の配送業者での配達となります。［定形外.メール便.クリックポスト.などへの変更.ご指定は不可］
・運送会社の指定、には対応できません。
・運送会社への発送には対応できません。
・配送方法から送料をご確認下さい。

一部の予約商品を除いて商品は、提携業者倉庫にて保管しております。ですので迅速な発送が可能となります。
配送委託業者より商品が発送される事もあります。ですので業者名入り、または無地以外の梱包で商品が届く事がございます。

配送時の事故などは、免責とさせていただきます。配送時の外装パッケージの変形やヘコミなどの不良は保証対象外になります。［保証の対象は、商品本体のみ となっております］
落札商品を配送する為に、必要な範囲でだけ個人情報を利用させていただきます。［※配送委託している配送業者、など第三者に伝達させて頂きます］
`;

const desc3 = `【注意】
Yahooオークションのシステムが変更され、商品到着後に商品受取連絡をしないと入金とされない形式になりました。
落札者様の中に受け取り連絡を忘れてしまう落札者様も多数いる為
商品の到着後2日以内に受取ボタンを押されない場合には申し訳ありませんが悪いの評価とさせて頂きます。

●落札後にキャンセルできません

●配送は、局留め対応できません
●局留め不可、センタ―止めの対応できません
以前トラブルとなりました。その為に対応しておりません

もしですが、2個以上の商品を購入したい場合には【商品代金＋配送料】が個々に発生いたします。
お手頃なお値段で商品代金の提供させていただく形をとっております。
落札代金＋配送料(送料)となります。
低価格からオークションの開始とさせて頂いております
複数店舗で同時販売の為、売切となってしまう事も御座います。
店舗の販売、限定品で行っておりますので商品が僅かな差で売切れとなる時も御座います。
そういった場合には商品の補充に2週間、程度のお時間がかかってしまう事もあります。

◆急いでる場合には
3日経過後に連絡やメッセージ一切ない時にはキャンセル扱いとなる時があります。
キャンセル扱いとなりますと落札者都合のキャンセルとなりますので、ヤフーオークションのシステムの関係上ヤフーより悪い評価がついてしまいます。

◆落札商品の発送に関しまして
お一人様につき1個の限定とさせて頂きます。
配送委託の業者=ヤマト運輸.日本郵政［配送委託業者の指定不可、対応できません］
配達業者の指定、局留め又は代金引換、営業所止め、コンビニ受取、その他商品との同梱、領収証の発行には対応できません。

迅速に商品の発送を可能にする為に、一部の予約商品以外を配送センターで保管し管理しております。
物により関連のSHOPや委託配送の業者から直送となる場合が御座います。予めのご了承をお願い致します。

提携の業者倉庫に配送と管理を委託しております。
時と場合になり委託業者名の記載された梱包で発送されます。ご了承下さい。
また梱包にシールや印字、無地ではない梱包がされている事がございます。着払いと手渡し不可、対応できません。

◆免責事項
配達途中の天候や災害、交通機関による事故と遅延
配達途中にできた梱包の汚れ、外箱の変形など本体以外の不良は保証外となります。

◆個人情報について
落札商品の配達に必要な範囲で、利用させて頂きます。
第三者となる配送委託の業者に必要範囲のみ通知させて頂きます。
`;

function createDescription(item: AmazonItemDetail) {
    let desc = "";
    desc += descriptionTitle(item.title);
    desc += descriptionFeatureBullets(item.featureBullets);
    desc += descriptionDetails([item.details, item.features_productOverview, item.features_detailBullets]);
    desc += descriptionHtml(item.productDescription);
    desc += descriptionHtml(item.makerDescription);
    // desc += descriptionRelated();
    desc += createSection("支払方法", desc1.replace(/\n/g, "<br>"));
    desc += createSection("発送詳細", desc2.replace(/\n/g, "<br>"));
    desc += createSection("注意事項", desc3.replace(/\n/g, "<br>"));
    return normalizeWhitespace(desc);
}

function createAuctionData(detail: AmazonItemDetail): AuctionExhibit {
    const COMMISION = 0.1;
    const PROFIT = 300;
    let price = detail.item.price * (1.0 / (1.0 - COMMISION)) * 1.05 + PROFIT;
    return {
        images: [],
        title: normalizeTitle(detail.title),
        price: price | 0,
        description: createDescription(detail),
        days: 7,
        closingHours: random(0, 23),
        shipSchedule: ShipSchedule["1～2日で発送"],
        shipName: "Amazon FBA",
        prefecture: Prefecture["東京都"]
    };
}

export function exhibitAmazonAuction(session: YahooSession, asin: string) {
    return Execution.transaction(arguments, "Application", getCurrentFilename())
        .then(val => DBExecution.amazon(rep => getLatestVersionAmazonItemDetail(asin)))
        .then(val => {
            if (!val) {
                throw `${asin} is not found`;
            }
            return Execution.resolve(val);
        })
        .then(detail => Execution.sequence<string, Buffer>(detail.images?.slice(0, 10) || [], undefined, LogType.ON_FAILURE_ONLY)
            .element(val => WebExecution.get({ url: val, useBinary: true }, doc => doc.buffer))
            .map(val => ({ detail, images: val })))
        .then(val => {
            if (val.images && val.images.length > 0) {
                return exhibitAuction(session, { ...createAuctionData(val.detail), images: val.images }, asin);
            } else {
                return Execution.cancel();
            }
        });
}  