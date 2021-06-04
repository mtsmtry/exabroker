import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

export function getClosedAuctionCount(cookie: Cookie) {
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/closeduser/jp/show/mystatus?select=closed&hasWinner=0",
        cookie
    }, doc => parseInt(doc.getById("acWrContents").text.match(/([0-9]+)件中/)?.[1] || "0"), "YahooDriver", getCurrentFilename())
}