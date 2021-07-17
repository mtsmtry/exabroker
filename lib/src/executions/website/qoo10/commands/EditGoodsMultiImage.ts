import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";

export interface Qoo10MultiImage {
    itemCode: string;
    images: string[];
}

interface Result {
    ResultCode: number;
    ResultMsg: string;
}

function getForm(data: Qoo10MultiImage) {
    const form = { itemCode: data.itemCode };
    for (let i = 0; i <= 10; i++) {
        if (data.images.length > i) {
            form[`EnlargedImage${i + 1}`] = data.images[i];
        } else {
            form[`EnlargedImage${i + 1}`] = "";
        }
    }
    return form;
}

export function editGoodsMultiImage(sellerKey: string, data: Qoo10MultiImage) {
    return WebExecution.post({
        url: "http://api.qoo10.jp/GMKT.INC.Front.QAPIService/ebayjapan.qapi/ItemsContents.EditGoodsMultiImage",
        form: getForm(data),
        headers: {
            GiosisCertificationKey: sellerKey,
            QAPIVersion: "1.0"
        }
    }, doc => {
        const result: Result = doc.json;
    }, "YahooDriver", getCurrentFilename());
}
