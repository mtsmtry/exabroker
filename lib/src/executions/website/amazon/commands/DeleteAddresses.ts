import { Execution } from "../../../../system/execution/Execution";
import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";
import { getFormHiddenInputData, getFormHiddenInputDataFromElement } from "../../Utilts";

export function deleteAddresses(session: Cookie) {
    return WebExecution.webTransaction({}, "AmazonDriver", getCurrentFilename())
        .thenGet("GetAddresses",
            val => ({
                url: "https://www.amazon.co.jp/a/addresses",
                cookie: session
            }),
            doc => ({
                addresses: doc.find("//*[contains(@class, 'address-column')]")
                    .slice(2)
                    .map(elm => getFormHiddenInputDataFromElement(elm))
            }))
        .then(val => Execution.sequence(val.addresses, 50)
            .element(val =>
                WebExecution.post({
                    url: "https://www.amazon.co.jp/a/addresses/delete",
                    form: val,
                    cookie: session
                }, doc => null)
            ));
}