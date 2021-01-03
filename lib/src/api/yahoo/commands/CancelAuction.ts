import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction } from "./Utilts";

export const cancelAuction = createWebTransaction<{
    session: Cookie,
    aid: string
}>()
    .setCookie(val => val.session)
    .thenGet("GetCrumb",
        val => ({
            url: `https://page.auctions.yahoo.co.jp/jp/show/cancelauction?aID=${val.aid}`
        }),
        (doc, val) => ({
            crumb: doc.getNeeded("//*[@name='crumb']").attrNeeded("value"),
            aid: val.aid
        }))
    .thenPost("Cancel",
        val => ({
            url: "https://page.auctions.yahoo.co.jp/jp/config/cancelauction",
            form: { aID: val.aid, crumb: val.crumb }
        }),
        doc => ({
            header: doc.get("//*[@id='closedHeader']")
        }))
    .resolve(val => ({
        valid: val.header != null,
        result: null
    }));