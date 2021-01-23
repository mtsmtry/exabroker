import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";
import { getFormHiddenInputData } from "../../Utilts";

export interface PurchaseAddress {
    fullName: string;
    postalCode1: string;
    postalCode2: string;
    stateOrRegion: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    phoneNumber: string
}

export function purchase(asin: string, address: PurchaseAddress, cookie: Cookie) {
    return WebExecution.webTransaction(cookie, "AmazonDriver", getCurrentFilename())
        .setCookie(val => val)
        .thenGet("GetForm",
            val => ({
                url: `https://www.amazon.co.jp/dp/${asin}`
            }),
            doc => ({
                form: getFormHiddenInputData(doc, "//form[@id='addToCart']")
            }))
        .thenPost("BuyNow",
            val => ({
                url: "https://www.amazon.co.jp/gp/product/handle-buy-box/ref=dp_start-bbf_1_glance",
                form: {
                    ...val.form,
                    quantity: 1,
                    "submit.buy-now": "送信"
                }
            }),
            doc => {
                const form = getFormHiddenInputData(doc, "//form[@id='spc-form']");
                return toNotNull({
                    purchaseId: form["purchaseId"],
                    form
                })
            })
        .thenPost("SetAddress",
            val => ({
                url: "https://www.amazon.co.jp/gp/buy/shipaddressselect/handlers/continue.html",
                form: {
                    purchaseId: val.purchaseId,
                    enterAddressCountryCode: "JP",
                    enterAddressIsDomestic: 1,
                    enterAddressFullName: address.fullName,
                    enterAddressPostalCode: address.postalCode1,
                    enterAddressPostalCode2: address.postalCode2,
                    enterAddressStateOrRegion: address.stateOrRegion,
                    enterAddressAddressLine1: address.addressLine1,
                    enterAddressAddressLine2: address.addressLine2,
                    enterAddressAddressLine3: address.addressLine3,
                    enterAddressPhoneNumber: address.phoneNumber
                }
            }),
            (doc, val) => ({
                form: val.form
            }))
        .thenPost("PlaceOrder",
            val => ({
                url: "https://www.amazon.co.jp/gp/buy/spc/handlers/static-submit-decoupled.html/ref=ox_spc_place_order",
                form: { ...val.form, placeYourOrder1: 1 }
            }),
            doc => toNotNull({
                orderId: doc.text.match(/注文番号:\s*([0-9]{3}\-[0-9]{7}\-[0-9]{7})/)?.[1]
            }));
}