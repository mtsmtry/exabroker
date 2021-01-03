import { Cookie } from "../../../execution/WebExecution";
import { getFormInputAndSelectData, getFormHiddenInputData, createWebTransaction } from "./Utilts";

export const startContact = createWebTransaction<{ 
    session: Cookie,
    aid: string, 
    sellerId: string,
    username: string
}>()    
    .setCookie(val => val.session)
    .thenGet("GetStartUrl",
        val => ({
            url: "https://contact.auctions.yahoo.co.jp/buyer/top",
            params: { aid: val, syid: val.sellerId, bid: val.username }
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
        result: null
    }));