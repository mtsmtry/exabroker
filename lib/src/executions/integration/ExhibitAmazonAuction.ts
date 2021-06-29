import { Connection, Transaction } from "typeorm";
import { AmazonItemDetail } from "../../entities/website/AmazonItemDetail";
import { AmazonRepository } from "../../repositories/AmazonRepository";
import { YahooRepository } from "../../repositories/YahooRepository";
import { getCurrentFilename, notNull, random, randomPositiveInteger } from "../../Utils";
import * as stripHtml from "string-strip-html";
import * as normalizeWhitespace from "normalize-html-whitespace";
import * as fs from "fs";
import { Document } from "../../system/Document";
import { AuctionExhibit, exhibitAuction } from "../website/yahoo/api/ExhibitAuction";
import { Prefecture, ShipSchedule } from "../website/yahoo/YahooDriver";
import { YahooSession } from "../website/yahoo/api/GetSession";
import { Execution, LogType } from "../../system/execution/Execution";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { WebExecution } from "../../system/execution/WebExecution";
import { getWideLength, replaceDict } from "./Utils";
import { getAmazonItemDetail } from "./GetAmazonItemDetail";
import { AuctionImage } from "../../entities/website/YahooAuctionExhibit";
import { getAuctionPrice, isExhibitableItem } from "./Algorithm";
import { getItemState, getItemStateWithProxy } from "../website/amazon/Amazon";

const MAX_TITLE_LENGTH = 65;

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
        .map(x => x.trim())
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

const desc1 = `Yahoo!かんたん決済
- クレジットカード
- 銀行振込（振込先：ジャパンネット銀行）
- ジャパンネット銀行支払い
- PayPay
- コンビニ支払い
- Ｔポイント
`;

const desc2 = `・送料は、<b>全国一律で無料</b>となっております。
・お支払い後、<b>通常24時間以内</b>に発送いたします。
・提携倉庫業者やAmazonに配送と管理を委託しております。業者名入りの梱包で配送になる場合がございます。
・着払いまたは代引き、営業所止め、局留め、コンビニ受取、他の商品との同梱には対応できません。
・ヤマト運輸、日本郵政、その他の配送業者での配達となります。配送業者の指定には対応できません。
・発送委託業者より商品が発送される事があります。業者名入り、または無地以外の梱包で商品が届く事があります。
・配送時の事故などは、免責とさせていただきます。配送時の外装パッケージの変形やヘコミなどの不良は保証対象外になります。
`;

const desc3 = `・商品が不良品の場合は、<b>返送と返金</b>にて対応いたします。
・受け取り連絡を忘れてしまう落札者様が多いため、商品の到着後2日以内に受取ボタンを押されない場合には、申し訳ありませんが悪い評価とさせて頂きます。
・商品の配送のため、発送委託など必要な範囲内において個人情報を利用させていただきます。
・領収証の発行には対応できません。
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

function createAuctionData(detail: AmazonItemDetail, price: number): AuctionExhibit {
    return {
        images: [],
        title: normalizeTitle(detail.title),
        price,
        description: createDescription(detail),
        days: 4,
        closingHours: random(0, 23),
        shipSchedule: ShipSchedule["1～2日で発送"],
        shipName: "Amazon FBA",
        prefecture: Prefecture["東京都"],
        categoryId: null
    };
}

export function exhibitAmazonAuction(session: YahooSession, asin: string) {
    return Execution.transaction("Integration", getCurrentFilename())
        .then(val => DBExecution.integration(rep => rep.existsAuctionExhibit(asin)))
        .then(val => {
            if (val) {
                return Execution.cancel();
            }
            return Execution.transaction()
                .then(() => Execution.batch()
                    .and(() => getItemStateWithProxy(asin).map(state => ({ state })))
                    .and(() => DBExecution.integration(rep => rep.getAuctionImages(asin)).map(cacheImages => ({ cacheImages })))
                )
                .then(val => {
                    if (!isExhibitableItem(val.state)) {
                        return Execution.cancel();
                    }
                    return Execution.transaction()
                        .then(() => getAmazonItemDetail(asin).map(detail => ({ ...val, detail })))
                        .then(val => {
                            if (Array.isArray(val.cacheImages) && val.cacheImages.length > 0) {
                                return Execution.resolve({ ...val, images: val.cacheImages as Buffer[] | AuctionImage[] })
                            } else {
                                return Execution.sequence<string, Buffer>(val.detail.images?.slice(0, 10) || [], 5, "Inner", "DownloadImages")
                                    .element(val => WebExecution.get({ url: val, useBinary: true }, doc => doc.buffer))
                                    .map(images => ({ ...val, images: images as Buffer[] | AuctionImage[] }))
                            }
                        })
                        .then(val => {
                            if (val.images.length > 0 && val.state.price) {
                                const price = getAuctionPrice(val.state.price);
                                const auctionData = createAuctionData(val.detail, price);
                                return Execution.transaction()
                                    .then(_ => exhibitAuction(session, { ...auctionData, images: val.images }))
                                    .then(aid => DBExecution.integration(rep => rep.createArb(aid, asin, val.state, price)));
                            }
                            return Execution.cancel();
                        });
                })
        });
}