import { createWebGet } from "./Utils"
import { toNotNull } from "../../../Utils";
import { Cookie } from "../../../execution/WebExecution";

export interface YahooAuctionAccountStatus {
    isPremium: boolean;
    isExhibitable: boolean;
    rating: number;
    balance: number;
}

export const getAccountStatus = createWebGet(
    (val: { username: string, session: Cookie }) => ({
        url: "https://auctions.yahoo.co.jp/user/jp/show/mystatus",
        cookie: val.session
    }),
    (doc, val) => {
        const tag = doc.getNeeded("//*[@id='acMdStatus']");
        const rating = tag.get(`.//a[@href='https://auctions.yahoo.co.jp/jp/show/rating?userID=${val.username}']`);
        const balance = tag.get(`.//a[@href='https://receive.wallet.yahoo.co.jp/list']`);
        return toNotNull({
            isPremium: tag.text.includes("プレミアム会員登録済み"),
            isExhibitable: !tag.text.includes("出品制限中") && !tag.text.includes("停止中"),
            rating: tag.text.includes("新規") ? 0 : rating?.extractDigits(),
            balance: balance?.extractDigits()
        });
    }
);
/*
    async getAccountStatus(username: string): Promise<YahooAuctionAccountStatus> {
        console.log(`  driver:getAccountStatus ${username}`);
        const doc = await this.client.get("https://auctions.yahoo.co.jp/user/jp/show/mystatus");
        doc.save();
    }
*/
