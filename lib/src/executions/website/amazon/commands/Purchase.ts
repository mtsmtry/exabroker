import { AmazonOrder, DeliveryAddress, OrderStatus, PaymentMethod } from "../../../../entities/website/AmazonOrder";
import { Document, Element } from "../../../../system/Document";
import { Execution } from "../../../../system/execution/Execution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, notNull, parseIntOrNull, randomPositiveInteger, toNotNull } from "../../../../Utils";
import { getFormHiddenInputData, getFormHiddenInputDataFromElement } from "../../Utilts";

function parseDate(date: string) {
    // ex: 12月26
    const m = date.match(/([0-9]+)月([0-9]+)/);
    if (!m) {
        throw "Do not match date format";
    }
    const month = parseInt(m[1]) - 1;
    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth() + 1;
    let year = nowYear;
    if (nowMonth == 1 && month == 12) {
        year = nowYear - 1;
    }
    return new Date(year, month, parseInt(m[2]));
}

export function getInputData(elm: Element): object {
    const inputs = elm.find(".//input");
    return inputs.map(input => {
        const name = input.attr("name") || input.attr("id");
        const value = input.attr("value");
        return name !== null ? { name, value: value || "" } : null;
    }).filter(notNull).reduce((m: object, x) => {
        m[x.name] = x.value;
        return m;
    }, {});
}

export interface PaymentInfo {
    number: string;
    method: PaymentMethod;
}

function getPaymentForm(doc: Document, payment: PaymentInfo) {
    const span = doc.getNeeded(`//span[@data-number='${payment.number.slice(-4)}']`).parent.attrNeeded("id");
    const match = span.match(/(pp\-[a-zA-Z0-9_]+\-)([0-9]+)/) || [];
    const rootId = match[1] + (parseInt(match[2]) - 3);
    const form = getInputData(doc.getById(rootId));
    return toNotNull({
        customerId: doc.text.match(/customerId: '(.*?)'/)?.[1],
        widgetState: doc.getNeeded("//input[@name='ppw-widgetState']").attrNeeded("value"),
        form
    });
}

export function purchase(asin: string, address: DeliveryAddress, cookie: Cookie, payment: PaymentInfo) {
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
                    purchaseId: form["purchaseID"],
                    form
                });
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
            (doc, val) => {
                const shippingFormElm = doc.get("//form[@id='shippingOptionFormId']");
                const shippingForm = shippingFormElm ? getFormHiddenInputDataFromElement(shippingFormElm) : null;
                return {
                    purchaseForm: val.form,
                    shippingForm,
                    ...(shippingForm ? {} : getPaymentForm(doc, payment))
                };
                //form: doc.getNeeded(`//span[@data-number='${7382}']`).parent.attrNeeded("")
            })//4297 6901 3255 7382
        .thenPost("ContinueShipOption",
            val => ({
                url: "https://www.amazon.co.jp/gp/buy/shipoptionselect/handlers/continue.html/ref=chk_ship_option_continue?ie=UTF8&fromAnywhere=0",
                form: { ...val.shippingForm, order_0_ShippingSpeed: "exp-jp-timed" } || {}
            }),
            (doc, val) => {
                if (val.shippingForm) {
                    return { ...getPaymentForm(doc, payment), purchaseForm: val.purchaseForm };
                } else if (val.widgetState && val.customerId && val.form) {
                    return { widgetState: val.widgetState, customerId: val.customerId, form: val.form, purchaseForm: val.purchaseForm };
                } else {
                    throw "";
                }
            })
        .thenPost("SendCardNumber",
            val => ({
                url: `https://www.amazon.co.jp/payments-portal/data/f1/widgets2/v1/customer/${val.customerId}/continueWidget`,
                form: {
                    addCreditCardNumber: payment.number, //"4297 6901 3255 7382",
                    "ppw-jsEnabled": true,
                    "ppw-widgetEvent": "ConfirmAndUpdateCreditCardEvent",
                    "ppw-installmentActivation": false,
                    "ppw-refreshView": false,
                    "ppw-instrumentId": val.form["ppw-instrumentRowSelection"].match(/instrumentId=(.*?)&/)[1],
                    "ppw-instrumentRowSelection": val.form["ppw-instrumentRowSelection"],
                    "ppw-widgetState": val.widgetState
                }
            }),
            (doc, val) => ({
                purchaseForm: val.purchaseForm,
                customerId: val.customerId,
                widgetState: val.widgetState,
                form: val.form
            }))
        .thenPost("SelectPayType",
            val => {
                function installmentCategory(category: string) {
                    return Object.keys(val.form)
                        .filter(x => x.endsWith("installmentCategory"))
                        .reduce((m, x) => { m[x] = category; return m }, {});
                }
                let installment = {};
                if (payment.method == PaymentMethod.CREDIT) {
                    installment = installmentCategory("ONETIME");
                } else if (payment.method == PaymentMethod.CREDIT_TWICE) {
                    installment = installmentCategory("NTIMES_INTEREST_FREE");
                }
                return {
                    url: "https://www.amazon.co.jp/gp/buy/shared/handlers/async-continue.html",
                    form: {
                        "ppw-widgetState": val.widgetState,
                        hasWorkingJavascript: 1,
                        "ppw-jsEnabled": true,
                        "ppw-widgetEvent": "SetPaymentPlanSelectContinueEvent",
                        isClientTimeBased: 1,
                        handler: "/gp/buy/payselect/handlers/apx-submit-continue.html",
                        "ppw-instrumentRowSelection": val.form["ppw-instrumentRowSelection"], // ONETIME, NTIMES_INTEREST_FREE, INSTALLMENT, REVOLVING
                        ...installment,
                        ...Object.keys(val.form)
                            .filter(x => x.endsWith("addCreditCardNumber"))
                            .reduce((m, x) => { m[x] = val.form[x]; return m }, {})
                    }
                };
            },
            (doc, val) => ({
                purchaseForm: val.purchaseForm
            }))
        .thenPost("PlaceOrder",
            val => ({
                url: "https://www.amazon.co.jp/gp/buy/spc/handlers/static-submit-decoupled.html/ref=ox_spc_place_order",
                form: { ...val.purchaseForm, placeYourOrder1: 1 }
            }),
            (doc, val) => {
                const content = doc.getNeeded("//meta").attrNeeded("content");
                return toNotNull({
                    purchaseId: content.match(/purchaseId=([0-9\-]+)&/)?.[1],
                    price: parseIntOrNull(val.purchaseForm["purchaseTotal"]),
                    url: content.slice("0; url=".length)
                });
            })
        .thenGet("GetOrderData",
            val => ({
                url: val.url
            }),
            (doc, val) => {
                const deliveryDayText = doc.getById("delivery-promise-orderGroupID0#itemGroupID0").text;
                const deliveryDayTexts = deliveryDayText.split("～");
                const deliveryDays = deliveryDayTexts.map(parseDate);
                return {
                    deliveryAddress: address,
                    deliveryAddressText: doc.getById("shipment-text-orderGroupID0").text.replace("に配送", "").replace(/\n/g, ""),
                    deliveryDay: deliveryDays[0],
                    deliveryLatestDay: deliveryDays[1] || null,
                    deliveryDayText,
                    status: OrderStatus.NONE,
                    price: val.price,
                    orderId: val.purchaseId,
                    paymentMethod: payment.method,
                    asin
                }
            });
}