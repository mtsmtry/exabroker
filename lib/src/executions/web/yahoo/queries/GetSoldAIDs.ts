import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

interface PageData {
    navigation: {
        pageName: "CLOSEDUSER_CLOSED",
        device: "PC"
    },
    items: {
        productID: string,
        productName: string,
        price: string
        endTime: string
    }[]
}

export function getSoldAIDs(session: Cookie) {
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/closeduser/jp/show/mystatus?select=closed&hasWinner=1",
        cookie: session
    }, doc => {
        const match = doc.text.match(/var pageData =([\s\S]*?);\n/);
        if (!match) {
            return [];
        }
        let json = match[1];
        json = json.replace(/\/\/.*/g, "");   // remove comments
        json = json.replace(/},\s*]/g, "}]"); // remove trailing comma
        const pageData: PageData = JSON.parse(json);
        return pageData.items.map(x => x.productID);
    }, "YahooDriver", getCurrentFilename());
}