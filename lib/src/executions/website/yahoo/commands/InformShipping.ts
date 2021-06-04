import { Execution } from "../../../../system/execution/Execution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { toNotNull } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function informShipping(aid: string, cookie: Cookie) {
    const params = { shipInvoiceNumReg: 1, shipInvoiceNumber: 1, shipUrl: "" };
    return WebExecution.webTransaction(cookie)
        .setCookie(val => val)
        .thenGet("GetUrl",
            val => ({
                url: `https://contact.auctions.yahoo.co.jp/seller/top?aid=${aid}`
            }),
            doc => toNotNull({
                href: doc.getNeeded("//input[@class='libBtnBlueL']").attrNeeded("onclick").match(/href='(.*?)'/)?.[1]
            }))
        .thenPost("GetForm",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp" + val.href,
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@action='/seller/preview']")
            }))
        .thenPost("SendPreview",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/seller/preview",
                form: val.form,
                params
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@action='/seller/submit']")
            }))
        .thenPost("SendSubmit",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/seller/submit",
                form: val.form,
                params
            }),
            doc => null)
}