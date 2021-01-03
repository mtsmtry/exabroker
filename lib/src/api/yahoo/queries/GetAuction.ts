import { toNotNull } from "../../../Utils";
import { createWebGet } from "./Utils"

export interface AuctionDetail {
    aid: string;
    title: string;
    sellerId: string;
}

export const getAuction = createWebGet(
    (val: { aid: string }) => ({
        url: `https://page.auctions.yahoo.co.jp/jp/auction/${val.aid}`
    }),
    (doc, val) => toNotNull({
        aid: val.aid,
        title: doc.getNeeded("//h1[@class='ProductTitle__text']").text,
        sellerId: doc.getNeeded("//span[@class='Seller__name']/a").text,
    })
);

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