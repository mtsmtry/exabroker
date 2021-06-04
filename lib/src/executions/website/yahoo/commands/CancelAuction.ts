import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

export function cancelAuction(session: Cookie, aid: string) {
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenGet("GetCrumb",
            _ => ({
                url: `https://page.auctions.yahoo.co.jp/jp/show/cancelauction?aID=${aid}`
            }),
            (doc) => ({
                crumb: doc.getNeeded("//*[@name='crumb']").attrNeeded("value")
            }))
        .thenPost("Cancel",
            val => ({
                url: "https://page.auctions.yahoo.co.jp/jp/config/cancelauction",
                form: { aID: aid, crumb: val.crumb, cancel_fee: "none", confirm: "取り消す" }
            }),
            doc => ({
                header: doc.get("//*[@id='closedHeader']")
            }))
        .resolve(val => ({
            valid: val.header != null,
            result: undefined
        }));
}