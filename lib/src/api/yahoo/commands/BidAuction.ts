import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export const bidAution = createWebTransaction<{
    session: Cookie,
    aid: string,
    price: number
}>()
    .setCookie(val => val.session)
    .thenGet("GetFormData", 
        val => ({
            url: `https://page.auctions.yahoo.co.jp/jp/auction/${val.aid}`
        }),
        (doc, val) => ({
            form: getFormHiddenInputData(doc, "//form[@method='post']"),
            price: val.price
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
        result: null
    }));