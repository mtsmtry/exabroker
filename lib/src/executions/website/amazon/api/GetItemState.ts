import { Transaction } from "typeorm";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

export function getItemState(asin: string) {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val =>
            WebExecution.get({
                url: "http://api.scraperapi.com",
                params: { api_key: "68d6de532946616aae283bc9fd0ea7a2", url: `https://www.amazon.co.jp/dp/${asin}` }
            }, doc => {
                const buybox = doc.get("//*[@id='price_inside_buybox']");
                return {
                    price: buybox?.extractDigits() || null,
                    isAddon: doc.getNeeded("//form[@id='addToCart']").text.includes("あわせ買い対象商品"),
                    hasStock: buybox != null
                }
            })
        )
        .then(val => DBExecution.amazon(rep => rep.createItemState(asin, val.price, val.hasStock, val.isAddon)))
}