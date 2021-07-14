import { Transaction } from "typeorm";
import { AmazonItemState } from "../../../../entities/website/AmazonItemState";
import { Document } from "../../../../system/Document";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

function parse(doc: Document) {
    const buybox = doc.get("//*[@id='price_inside_buybox']");
    const availability = doc.get("//*[@id='availability']");
    const availabilityText = availability?.text || "";
    return {
        price: buybox?.extractDigits() || null,
        isAddon: doc.getNeeded("//form[@id='addToCart']").text.includes("あわせ買い対象商品"),
        hasStock: availabilityText.includes("在庫あり") || availabilityText.includes("残り"),
        hasEnoughStock: availabilityText.includes("在庫あり"),
        body: doc.text
    }
}

export function getItemState(asin: string) {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val =>
            WebExecution.get({
                url: `https://www.amazon.co.jp/dp/${asin}?language=ja_JP`
            }, parse)
        )
        .then(val => DBExecution.amazon(rep => rep.createItemState(asin, val.price, val.hasStock, val.hasEnoughStock, val.isAddon)).map(state => ({ ...state, body: val.body }) as AmazonItemState & { body: string } ))
}

export function getItemStateWithProxy(asin: string) {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val =>
            WebExecution.get({
                url: "http://api.scraperapi.com",
                params: { api_key: "68d6de532946616aae283bc9fd0ea7a2", keep_headers: true, url: `https://www.amazon.co.jp/dp/${asin}?language=ja_JP` },
                headers: { 
                    'Accept-Language': 'ja-JP',
                    cookie: "session-id=356-3629590-6887515; i18n-prefs=JPY; skin=noskin; ubid-acbjp=357-4619398-6488862; session-token=ZjkBqs69vyCXXeGH4zIOLF6YWtQDLQbiOx/4TsuyuPYdAAT8k6bRl4rvg3dsuiofixZ8Axu6dct0Zf2whH/6RnhDGFrnMAMlNu5onFQp8gfeD5Sx7hVLlepAG2/IcMV5S+8vZYm1vvnwI+P9iVmmqapz1ijMWzzuQ/iH+8ge4PMEJfEFEkMFF8NC8d/UPYin/WpxWiTHUx8K9Heb9Me61W2H7UAS+1h3ZOxyvItRkAiselrqm3ic0nnddD5+wxM5; session-id-time=2082726001l; csm-hit=tb:FSBWWQGM7H17HCADER66+s-GRD1VSQ1NDEFSXWHQH3X|1626249232695&t:1626249232695&adb:adblk_no"
                }
            }, parse)
        )
        .then(val => DBExecution.amazon(rep => rep.createItemState(asin, val.price, val.hasStock, val.hasEnoughStock, val.isAddon)).map(state => ({ ...state, body: val.body }) as AmazonItemState & { body: string } ))
}