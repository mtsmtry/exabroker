import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";

const userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36";

export function getGoods(itemCode: string) {
    return WebExecution.get({
        url: "https://www.qoo10.jp/item/-/" + itemCode,
        headers: {
            "User-Agent": userAgent
        }
    }, doc => {
        const lis = doc.find("//ul[@class='category_depth_list']/li/span");
        const text = lis[lis.length - 1].attrNeeded("onclick");
        const match = text.match(/\/([0-9]+)','/);
        if (!match) {
            throw "Error";
        }
        return { categoryId: match[1] };
    }, "YahooDriver", getCurrentFilename());
}
