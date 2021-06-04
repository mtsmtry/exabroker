import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function bidAution(session: Cookie, aid: string, price: number) {
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenGet("GetFormData",
            _ => ({
                url: `https://page.auctions.yahoo.co.jp/jp/auction/${aid}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@method='post']"),
                price: price
            }))
        .thenGet("Preview",
            val => ({
                url: "https://auctions.yahoo.co.jp/jp/show/bid_preview",
                form: {
                    ...val.form,
                    Quantity: 1, 
                    buynow: 1, 
                    Bid: val.price 
                }
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@method='post']")
            }))
        .thenGet("PlaceBid",
            val => ({
                url: "https://auctions.yahoo.co.jp/jp/config/placebid",
                form: val.form
            }),
            doc => ({
                box: doc.get("//*[@id='modAlertBox']")
            }))
        .resolve(val => ({
            valid: val.box?.text.includes("あなたが落札しました"),
            result: undefined
        }));
}