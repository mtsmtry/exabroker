import { DeliveryAddress, PaymentMethod } from "../../../../entities/website/AmazonOrder";
import { DBExecution } from "../../../../system/execution/DatabaseExecution";
import { Execution } from "../../../../system/execution/Execution";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import * as amazonDriver from "../AmazonDriver";
import { PaymentInfo } from "../commands/Purchase";
import { AmazonSession } from "./GetSession";

const payment: PaymentInfo = {
    number: "4619 3592 2682 9450",
    method: PaymentMethod.DEBIT
}

export function orderItem(asin: string, address: DeliveryAddress, session: AmazonSession) {
    return Execution.transaction("Amazon", getCurrentFilename())
        .then(val => amazonDriver.purchase(asin, address, session.cookie, payment))
        .then(val => DBExecution.amazon(rep => rep.createOrder({ account: session.email, ...val })).map(_ => val.orderId))
}