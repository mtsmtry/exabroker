import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getFormHiddenInputData } from "../../Utilts";

export function sendMessage(aid: string, message: string, session: Cookie) {
    return WebExecution.webTransaction(session)
        .setCookie(val => val)
        .thenGet("GetForm",
            val => ({
                url: `https://contact.auctions.yahoo.co.jp/seller/top?aid=${aid}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//div[@class='decSmtBtn']")
            }))
        .thenPost("SendSubmit",
            val => ({
                url: "https://contact.auctions.yahoo.co.jp/message/submit",
                form: { ...val.form, body: message }
            }),
            doc => null);
}