import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";

export function getWalletInfo(cookie: Cookie) {
    return WebExecution.get({
        url: "https://receive.wallet.yahoo.co.jp/list",
        cookie
    }, doc => ({
        registeredBank: !doc.getNeeded("//a[.='現金で振込']").attrNeeded("class").includes("disabled"),
        balance: doc.getNeeded("//*[@class='Balance ProceedsText']").extractDigits()
    }))
}