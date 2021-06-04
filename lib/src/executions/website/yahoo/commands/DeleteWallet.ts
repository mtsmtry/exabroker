import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function deleteWallet(session: Cookie) { 
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenGet("GetCrumb",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_delete"
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='theform']")
            }))
        .thenPost("Delete",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_delete",
                form: { ...val.form, edit: "はい" }
            }),
            doc => ({
                msg: doc.get("//div[@id='msg']")
            }))
        .resolve(val => ({
            valid: val.msg?.text.includes("削除が完了しました"),
            result: undefined
        }));
}