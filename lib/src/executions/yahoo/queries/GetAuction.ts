import { WebExecution } from "../../../system/execution/WebExecution";
import { getCurrentFilename, toNotNull } from "../../../Utils";

export interface AuctionDetail {
    aid: string;
    title: string;
    sellerId: string;
}

export function getAuction(aid: string) {
    return WebExecution.get({
        url: `https://page.auctions.yahoo.co.jp/jp/auction/${aid}`
    }, doc => toNotNull({
        aid: aid,
        title: doc.getNeeded("//h1[@class='ProductTitle__text']").text,
        sellerId: doc.getNeeded("//span[@class='Seller__name']/a").text,
    }), "YahooDriver", getCurrentFilename());
}

/*
    async getAuction(aid: string): Promise<AuctionDetail> {
        console.log(`  driver:getAuction ${aid}`); 
        const doc = await this.client.get(`https://page.auctions.yahoo.co.jp/jp/auction/${aid}`);
        return toNotNull({
            aid,
            title: doc.getNeeded("//h1[@class='ProductTitle__text']").text,
            sellerId: doc.getNeeded("//span[@class='Seller__name']/a").text,
        });
    }*/