import { WebExecution } from "../../../system/execution/WebExecution";
import { parseFloatOrNull } from "../../../Utils";
import { getCurrentFilename, toNotNull } from "../../../Utils";

export interface SearchedAuction {
    title: string;
    aid: string;
    sellerId: string;
    sellerRating: number;
    bidPrice: number;
    buyPrice: number | null;
}

export enum AuctionSort {
    "おすすめ順" = "score2,d",
    "現在価格の安い順" = "cbids,a",
    "現在価格の高い順" = "cbids,d",
    "入札件数の多い順" = "bids,a",
    "入札件数の少ない順" = "bids,d",
    "残り時間の短い順" = "end,a",
    "残り時間の長い順" = "end,d",
    "即決価格の安い順" = "bidorbuy,a",
    "即決価格の高い順" = "bidorbuy,d",
    "注目のオークション順" = "featured,d"
}

export function searchAution(keyword: string, sort: AuctionSort) {
    const [s1, o1] = sort.split(",");
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/search/search",
        params: { p: keyword, mode: 2, n: 100, s1, o1 }
    }, doc => {
        const items = doc.find("//ul[@class='Products__items']/li[@class='Product']");
        return items.map(item => {
            const titleLink = item.getNeeded(".//a[@class='Product__titleLink']");
            return {
                buyPrice: item.get(".//span[@class='Product__priceValue']")?.extractDigits() || null,
                ...toNotNull({
                    title: titleLink.text,
                    aid: titleLink.attrNeeded("href").match("auction/([0-9a-z]+)")?.[1],
                    bidPrice: item.getNeeded(".//span[@class='Product__priceValue u-textRed']").extractDigits(),
                    sellerId: item.getNeeded(".//a[@class='Product__seller']").text,
                    sellerRating: parseFloatOrNull(item.getNeeded(".//a[@class='Product__rating']").text.slice(0, -1))
                })
            };
        });
    }, "YahooDriver", getCurrentFilename());
}
/*
    async searchAution(keyword: string, sort: AuctionSort): Promise<SearchedAuction[]> {
        console.log(`  driver:searchAution ${keyword} ${sort}`); 
        const [s1, o1] = sort.split(",");
        const params = { p: keyword, mode: 2, n: 100, s1, o1 };
        const doc = await this.client.get("https://auctions.yahoo.co.jp/search/search", params);
        const items = doc.find("//ul[@class='Products__items']/li[@class='Product']");
        return items.map(item => {
            const titleLink = item.getNeeded(".//a[@class='Product__titleLink']");
            return {
                buyPrice: item.get(".//span[@class='Product__priceValue']")?.extractDigits() || null,
                ...toNotNull({
                    title: titleLink.text,
                    aid: titleLink.attrNeeded("href").match("auction/([0-9a-z]+)")?.[1],
                    bidPrice: item.getNeeded(".//span[@class='Product__priceValue u-textRed']").extractDigits(),
                    sellerId: item.getNeeded(".//a[@class='Product__seller']").text,
                    sellerRating: parseFloatOrNull(item.getNeeded(".//a[@class='Product__rating']").text.slice(0, -1))
                })
            };
        });
    }*/