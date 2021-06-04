import { browserExecution } from "../../../../system/execution/BrowserExecution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";
import { relogin } from "./Login";

export function deleteBank(cookie: Cookie) {
    return WebExecution.webTransaction({}, "YahooDriver", getCurrentFilename())
        /*.thenExecution(_ => {
            return relogin("https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control", password, cookie)
        })*/
        .setCookie(val => cookie)
        .thenGet("Pre",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control"
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='theform']")
            }))
        .thenPost("Post", // 口座番号による本人確認
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_trans_update",
                form: { ...val.form, bknum: "7157158", next: "次へ" }
            }),
            doc => ({
                url: "https://edit.wallet.yahoo.co.jp/" + doc.getNeeded("//*[@class='Del_link']/a").attrNeeded("href")
            }))
        /*.thenGet("GetUrl",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_recv_account_control"
            }),
            doc => ({
                url: "https://edit.wallet.yahoo.co.jp/" + doc.getNeeded("//*[@class='Del_link']/a").attrNeeded("href")
            }))*/
        .thenGet("GetForm",
            val => ({
                url: val.url
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='theform']")
            }))
        .thenPost("DeleteBank",
            val => ({
                url: "https://edit.wallet.yahoo.co.jp/config/wallet_trans_delete",
                form: { ...val.form, edit: "はい" }
            }),
            doc => ({
                msg: doc.getById("msg")
            }))
        .resolve(val => ({
            valid: val.msg.text.includes("削除が完了しました"),
            result: null
        }))
}