import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export function changeAuctionPrice(cookie: Cookie, aid: string, price: number) {
    return WebExecution.webTransaction({}, "AuctionDriver", getCurrentFilename())
        .setCookie(val => cookie)
        .thenGet("GetForm",
            val => ({
                url: `https://page.auctions.yahoo.co.jp/jp/auction/${aid}`
            }), 
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@action='https://auctions.yahoo.co.jp/sell/jp/change/price']")
            }))
        .thenGet("ChangePrice",
            val => ({
                url: "https://auctions.yahoo.co.jp/sell/jp/change/price",
                params: { ...val.form, buyprice: price }
            }),
            doc => null
            )
        .thenGet("Check",
            val => ({
                url: `https://page.auctions.yahoo.co.jp/jp/auction/${aid}`
            }),
            doc => ({
                price: doc.getNeeded("//*[@class='Price__value']").extractDigits()
            }))
        .resolve(val => ({
            valid: val.price == price,
            result: null
        }));
}