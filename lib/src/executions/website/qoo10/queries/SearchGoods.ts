import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../../Utils";

const userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36";

export function searchGoods(keyword: string) {
    return WebExecution.get({
        url: "https://www.qoo10.jp/s/-",
        params: {
            keyword
        },
        headers: {
            "User-Agent": userAgent
        }
    }, doc => {
       const trs = doc.find("//tbody[@id='search_result_item_list']/tr");
       return trs.map(x => x.attrNeeded("goodscode"));
    }, "YahooDriver", getCurrentFilename());
}
