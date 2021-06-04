import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function reportViolation(aid: string) {
    return WebExecution.webTransaction("YahooDriver", getCurrentFilename())
        .thenGet("GetForm",
            val => ({
                url: `https://auctions.yahoo.co.jp/jp/show/violation_report?aID=${aid}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@method='post']")
            }))
        .thenPost("Submit",
            val => ({
                url: "https://auctions.yahoo.co.jp/jp/config/violation_report",
                form: { ...val.form, violation_code: "other", other_violation_code: 1004 } // 商品が手元にない
            }),
            doc => ({
                text: doc.text
            }))
        .resolve(val => ({
            valid: val.text.includes("ご申告いただきありがとうございました"),
            result: null
        }))
}