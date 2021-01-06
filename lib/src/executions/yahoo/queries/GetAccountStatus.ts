import { getCurrentFilename, toNotNull } from "../../../Utils";
import { Cookie, WebExecution } from "../../../system/execution/WebExecution";

export interface YahooAuctionAccountStatus {
    isPremium: boolean;
    isExhibitable: boolean;
    rating: number;
    balance: number;
}

export function getAccountStatus(username: string, session: Cookie) {
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/user/jp/show/mystatus",
        cookie: session
    }, doc => {
        const tag = doc.getNeeded("//*[@id='acMdStatus']");
        const rating = tag.get(`.//a[@href='https://auctions.yahoo.co.jp/jp/show/rating?userID=${username}']`);
        const balance = tag.get(`.//a[@href='https://receive.wallet.yahoo.co.jp/list']`);
        return toNotNull({
            isPremium: tag.text.includes("プレミアム会員登録済み"),
            isExhibitable: !tag.text.includes("出品制限中") && !tag.text.includes("停止中"),
            rating: tag.text.includes("新規") ? 0 : rating?.extractDigits(),
            balance: balance?.extractDigits()
        });
    }, "YahooDriver", getCurrentFilename());
}
/*
    async getAccountStatus(username: string): Promise<YahooAuctionAccountStatus> {
        console.log(`  driver:getAccountStatus ${username}`);
        const doc = await this.client.get("https://auctions.yahoo.co.jp/user/jp/show/mystatus");
        doc.save();
    }
*/
