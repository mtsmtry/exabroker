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
                    cookie: "session-id=355-8999670-1733602; i18n-prefs=JPY; skin=noskin; ubid-acbjp=356-9603892-1705265; session-token=UO6RhnoCzx9eV0BK3n4AOHctoQ65Oi1XcSZoBmR7B3N9BD+JKN3obsqn816D97jdif9s3E+o7CWETOdWLE79QkIAxPmRbiPTq9Up5OfYmnT8xAM1opxkWSUKCTDYn43gjOmDEaFPiJp9gyJn/+wf4cC/EiiLuPGNCQWP/zPR6CeddLUBZQaFkBJgor/b/PKZAEd7VaQp5cEkwuDIphTgXFUnPC9CUmgdEj/Cb1G2oQMPbo4X25bR8Rz6Q+baAgdN; csm-hit=tb:s-0PW6HBVE8NQSCJVMMP9P|1625030630541&t:1625030633267&adb:adblk_no; session-id-time=2082726001l"
                }
            }, parse)
        )
        .then(val => DBExecution.amazon(rep => rep.createItemState(asin, val.price, val.hasStock, val.hasEnoughStock, val.isAddon)).map(state => ({ ...state, body: val.body }) as AmazonItemState & { body: string } ))
}