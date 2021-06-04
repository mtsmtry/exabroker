import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function payout(cookie: Cookie) {
    return WebExecution.webTransaction({}, "YahooDriver", getCurrentFilename())
        .setCookie(val => cookie)
        .thenGet("GetForm",
            val => ({
                url: "https://receive.wallet.yahoo.co.jp/list"
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@name='payoutConfirm']")
            }))
        .thenPost("PayoutConfirm",
            val => ({
                url: "https://receive.wallet.yahoo.co.jp/payout_confirm",
                form: val.form
            }),
            doc => toNotNull({
                ba: doc.text.match(/input1.value = "(.+?)"/)?.[1],
                crumb: doc.text.match(/input2.value = "(.+?)"/)?.[1]
            }))
        .thenPost("PayoutDone",
            val => ({
                url: "https://receive.wallet.yahoo.co.jp/payout_done",
                form: {
                    ba: val.ba,
                    ".crumb": val.crumb
                }
            }),
            doc => ({
                main: doc.getNeeded("//*[@id='yjMain']")
            }))
        .resolve(val => ({
            valid: val.main.text.includes("振込依頼が完了"),
            result: null
        }))
}