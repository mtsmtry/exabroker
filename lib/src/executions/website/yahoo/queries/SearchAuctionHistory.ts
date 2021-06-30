import { WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

export function searchAuctionHistory(word: string) {
    return WebExecution.get({
        url: `https://auctions.yahoo.co.jp/closedsearch/closedsearch`,
        params: { p: word }
    }, doc => {
        const title = doc.get("//h2[@class='SearchMode__title']")?.text;
        if (title) {
            const match = title.match("([0-9,]+)件");
            if (match) {
                return { dealCount: parseInt(match[1].replace(",", "")) };
            }
        }
        return { dealCount: 0 }
    }, "YahooDriver", getCurrentFilename());
}
