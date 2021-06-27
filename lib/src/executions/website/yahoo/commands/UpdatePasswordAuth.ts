import { Execution } from "../../../../system/execution/Execution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";
import { relogin } from "./Login";

export function updatePasswordAuth(cookie: Cookie, password: string | null, status: 0 | 1) {
    return WebExecution.webTransaction("YahooDriver", getCurrentFilename())
        .thenExecution(val => {
            if (password) {
                return relogin("https://account.edit.yahoo.co.jp/change_pw", password, cookie);
            } else {
                return Execution.resolve(cookie)
            }
        })
        .setCookie(val => val)
        .thenGet("GetForm",
            val => ({
                url: "https://account.edit.yahoo.co.jp/change_pw"
            }),
            (doc, val) => ({
                form: getFormHiddenInputData(doc, "//form[@id='pwform']"),
                cookie: val
            }))
        .thenPost("Post",
            val => ({
                url: "https://account.edit.yahoo.co.jp/json/update_pw_auth",
                params: {
                    crumb: val.form[".crumb"],
                    status
                }
            }),
            (doc, val) => ({
                data: doc.json,
                cookie: val.cookie
            }))
        .resolve(val => ({
            valid: val.data["ResultCode"] == "SUCCESS",
            result: val.cookie
        }));
}