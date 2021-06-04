import { Execution } from "../../../../system/execution/Execution";
import { getCurrentFilename } from "../../../../Utils";
import { AmazonSession } from "./GetSession";
import * as amazonDriver from "../AmazonDriver";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";

export function syncOrders(session: AmazonSession) {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val => DBExecution.amazon(rep => rep.getOrdersNotReceived(session.email)))
        .then(val => Execution.sequence(val.map(x => x.orderId), 3)
            .element(orderId => Execution.transaction()
                .then(val => amazonDriver.getOrderDetail(orderId, session.cookie))
                .then(val => DBExecution.amazon(rep => rep.updateOrderDetail(orderId,
                    {
                        deliveryCompany: val.deliveryCompany,
                        deliveryTrackingId: val.deliveryTrackingId,
                        deliveryPlace: val.deliveryPlace,
                        deliveryPhotoUrl: val.deliveryPhotoUrl,
                        status: val.status
                    }))))
        );
}