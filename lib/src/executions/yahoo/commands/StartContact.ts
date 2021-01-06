import { Cookie, WebExecution } from "../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../Utils";
import { getFormInputAndSelectData, getFormHiddenInputData } from "./Utilts";

export function startContact(session: Cookie, aid: string,  sellerId: string, username: string) {  
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenGet("GetStartUrl",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/buyer/top",
                params: { aid, syid: sellerId, bid: username }
            }),
            doc => ({
                url: doc.getNeeded("//a[text()='取引をはじめる']").attrNeeded("href")
            }))
        .thenGet("GetFormData",
            val => ({
                url: `https://contact.auctions.yahoo.co.jp${val.url}`
            }),
            doc => ({
                form: getFormInputAndSelectData(doc, "//form[@action='/buyer/preview']")
            }))
        .thenPost("Preview", 
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/buyer/preview",
                data: { ...val.form, SendInfo1: 1, myCountry: 1, sendAddress: 0 }
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@action='/buyer/submit']")
            }))
        .thenPost("Submit",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/buyer/submit",
                form: val.form
            }),
            doc => ({
                msg: doc.get("//div[@id='yjMain']")?.text
            }))
        .resolve(val => ({
            valid: val.msg?.includes("出品者に取引情報の連絡をしました"),
            result: undefined
        }));
}