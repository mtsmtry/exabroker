import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function removeClosedAuctions(cookie: Cookie, page: number) {
    return WebExecution.webTransaction("YahooDriver", getCurrentFilename())
        .setCookie(val => cookie)
        .thenGet("GetForm",
            val => ({
                url: `https://auctions.yahoo.co.jp/closeduser/jp/show/mystatus?select=closed&hasWinner=0&apg=${page}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='auctionList']"),
                aidlist: doc.find("//input[@name='aidlist[]']").map(x => x.attrNeeded("value"))
            }))
        .thenPost("Remove",
            val => ({
                url: "https://auctions.yahoo.co.jp/closeduser/jp/uconfig/removeclosed",
                form: { ...val.form, aidlist: val.aidlist }
            }),
            (doc, val) => ({
                aidlist: val.aidlist,
                text: doc.text
            }))
        .resolve(val => ({
            valid: val.text.includes("チェックした商品を終了分から削除しました"),
            result: val.aidlist.length > 0
        }));
}