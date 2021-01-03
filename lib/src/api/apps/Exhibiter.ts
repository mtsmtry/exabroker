import { Connection } from "typeorm";
import { AmazonItemDetail } from "../../entities/AmazonItemDetail";
import { createDatabaseConnection } from "../../Factory";
import { AmazonRepository } from "../../repositories/AmazonRepository";
import { YahooRepository } from "../../repositories/YahooRepository";
import { notNull } from "../../Utils";
import * as stripHtml from "string-strip-html";
import * as normalizeWhitespace from "normalize-html-whitespace";
import * as fs from "fs";
import { Document } from "../../web/WebClient";
import { createTransaction } from "../yahoo/api/Utils";
import { DBAmazonExecution } from "../../execution/DatabaseExecution";

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
        src = src.replace(new RegExp(key), dict[key]);
    })
    return src;
}

function normalizeTitle(title: string) {
    const replaces = {
        "「": "", "」": "", '""': "", ":": "：", "/": "", "\\": "",
        "?": "", "<": "", ">": "", "|": "", "&": "＆", ";": ""
    }
    title = replaceDict(title, replaces);
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
        .filter(x => !x.includes("カスタマーレビュー") && !x.includes("Amazon"))
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
    html = stripHtml(html, options).result
        .replace(/ src=/g, " data-dammy=")
        .replace(/ data-src=/g, " src=")
        .replace(/ (class|href|style|data-[a-z\-]+)=["'].*?["']/g, " ")
        .replace(/もっと読む/g, "");
    return createSection("商品説明", html + toRowsTable(html));
}

function descriptionRelated(username: string, categoryId: number) {
    const url = `https://auctions.yahoo.co.jp/seller/${username}?auccat=${categoryId}`
    const content = `色違いやバージョン違い、同じカテゴリーの商品などは<a href="${url}">こちら</a>をご覧ください。`
    return createSection("関連商品", content);
}

function createDescription(item: AmazonItemDetail) {
    let desc = "";
    desc += descriptionTitle(item.title);
    desc += descriptionFeatureBullets(item.featureBullets);
    desc += descriptionDetails([item.details, item.features_productOverview, item.features_detailBullets]);
    desc += descriptionHtml(item.productDescription);
    desc += descriptionHtml(item.makerDescription);
    // desc += descriptionRelated();
    return normalizeWhitespace(desc);
}

function createAuctionData(detail: AmazonItemDetail): AuctionData {
    return {
        images: [],
        title: detail.title,
        price: detail.item.price + 1000,
        description: createDescription(detail),
        days: 7,
        closingHours: 23,
        shipSchedule: ShipSchedule["1～2日で発送"],
        shipName: "Amazon FBA",
        prefecture: Prefecture["東京都"]
    };
}

export const exhibitAmazonAuction =
    createTransaction<{ asin: string }>()
    .thenTranslate(new DBAmazonExecution((rep, val) => {
        return rep.getItemDetail(val.asin);
    }), val => val, (res, val) => ({ item: res }))
    .then

export class Exhibiter {
    yahooRep: YahooRepository;
    yahoo: YahooAuctionClient;
    amazonRep: AmazonRepository;

    constructor(private conn: Connection) {
        this.yahooRep = new YahooRepository(conn.manager);
        this.yahoo = new YahooAuctionClient(this.yahooRep);
        this.amazonRep = new AmazonRepository(conn.manager);
    }

    async testDescription() {
        console.log("getExhibitableItemDetails");
        const items = await this.amazonRep.getExhibitableASINs(10);
        console.log(items);
        const promises = items.map(async (asin, i) => {
            const item = await this.amazonRep.getItemDetail(asin);
            if (item) {
                console.log(`Save ${i}.html`)
                fs.writeFileSync(`test/${i}-makers.html`, item.makerDescription || "");
                fs.writeFileSync(`test/${i}.html`, createDescription(item));
            }
        });
        await Promise.all(promises);
    }

    async run3() {

    }

    async run() {
        await this.yahoo.login("hbbqy62195");
        const asins = await this.amazonRep.getExhibitableASINs(10);
        for (let i=0; i<asins.length; i++) {
            const item = await this.amazonRep.getItemDetail(asins[i]);
            if (item) {
                try {
                    await this.yahoo.exhibitAuction(createAuctionData(item));
                } catch(ex) {
                    console.log(ex);
                }
            }
        }
    }
}