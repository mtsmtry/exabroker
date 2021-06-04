import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";


export function repayEscrow(cookie: Cookie, aid: string) {
    return WebExecution.webTransaction({}, "YahooDriver", getCurrentFilename())
        .setCookie(val => cookie)
        .thenGet("GetForm",
            val => ({
                url: `https://contact.auctions.yahoo.co.jp/seller/top?aid=${aid}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@action='/seller/escrowrepaysubmit']")
            }))
        .thenPost("Repay",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/seller/escrowrepaysubmit",
                form: { ...val.form, checkRepay: 1 }
            }),
            doc => ({
                tag: doc.getNeeded("//*[@class='elAdvnc']")
            }))
        .resolve(val => ({
            valid: val.tag.text.includes("代金が落札者に返金"),
            result: null
        }))
}