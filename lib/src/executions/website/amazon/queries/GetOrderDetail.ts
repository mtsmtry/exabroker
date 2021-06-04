import { DeliveryPlace, OrderStatus } from "../../../../entities/website/AmazonOrder";
import { Cookie, WebExecution, WebTransaction } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";

export function getOrderDetail(orderId: string, session: Cookie) {
    return WebExecution.webTransaction(session, "AmazonDriver", getCurrentFilename())
        .setCookie(val => val)
        .thenGet("SearchOrder",
            val => ({
                url: `https://www.amazon.co.jp/gp/your-account/order-history/ref=ppx_yo_dt_b_search?search=${orderId}`
            }),
            doc => toNotNull({
                orderId: doc.text.match(/ppx_yo_dt_b_order_details_o00\?ie=UTF8&orderID=([0-9\-]+)/)?.[1]
            }))
        .thenGet("GetDetail", 
            val => ({
                url: `https://www.amazon.co.jp/gp/your-account/order-details/?orderID=${val.orderId}`
            }),
            doc => ({
                url: "https://www.amazon.co.jp" + doc.getNeeded("//*[@data-action='set-shipment-info-cookies']//a").attrNeeded("href")
            }))
        .thenGet("TrackProgress",
            val => ({
                url: val.url
            }),
            doc => {
                const primaryStatus = doc.getById("primaryStatus").text;
                let status = OrderStatus.NONE;
                if (primaryStatus.includes("お届け済み")) {
                    status = OrderStatus.RECEIVED;
                } else if (primaryStatus.includes("不在")) {
                    status = OrderStatus.ABSENCE;
                }

                const secondaryStatus = doc.get("//*[@id='secondaryStatus']");
                let deliveryPlace: DeliveryPlace | null = null;
                if (secondaryStatus) {
                    // ご注文商品を玄関にお届けしました。 Doorstep
                    // ご注文商品を郵便受けに配達しました。Mailbox
                    if (secondaryStatus.text.includes("玄関")) {
                        deliveryPlace = DeliveryPlace.DOORSTEP;
                    } else if (secondaryStatus.text.includes("郵便受け")) {
                        deliveryPlace = DeliveryPlace.MAILBOX;
                    }
                }
            
                const photoOnDelivery = doc.get("//*[@id='photoOnDelivery-container']//img");
                let deliveryPhotoUrl: string | null = null;
                if (photoOnDelivery) {
                    deliveryPhotoUrl = photoOnDelivery.attrNeeded("src");
                }

                const info = doc.get("//*[@id='carrierRelatedInfo-container']");
                let deliveryCompany: string | null = null;
                let deliveryTrackingId: string | null = null;
                if (info) {
                    status = OrderStatus.SHIPPED;
                    deliveryCompany = info.text.match(/配送業者\s*(\S+)/)?.[1] || info.text.match(/(\S+?)が配送/)?.[1] || null;
                    deliveryTrackingId = info.text.match(/(伝票番号|トラッキングID:)\s*([A-Z0-9]+)/)?.[2] || null;
                }
                
                return {
                    status,
                    deliveryPlace,
                    deliveryPhotoUrl,
                    deliveryCompany,
                    deliveryTrackingId,
                }
            });
}