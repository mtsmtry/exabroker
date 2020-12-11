import { AmazonItem } from "../entities/AmazonItem";
import { BrowseNode } from "../entities/BrowseNode";
import { Document } from "../html/Html";
import { Dto, notNull } from "../Utils";
import { parseFloatOrNull, parseIntOrNull } from "./Utils";

export async function scrapeAmazonBrowseNodeItemCount(doc: Document) {
    const items = doc.find("//*[@data-asin]");
    return items.length;
}

export async function scrapeAmazonBrowseNode(doc: Document, nodeId: string, page: number): Promise<Dto<AmazonItem>[]> {
    const items = doc.find("//*[@data-asin]");
    return items.map(item => {
        const asin = item.attr("data-asin")?.value();
        const title = item.get(".//*[@data-attribute]")?.attr("data-attribute")?.value();
        const price = item.get(".//span[contains(@class,'a-color-price')]")?.extractDigits();
        if (!title || !asin || !price) {
            return null;
        }
        const result: Dto<AmazonItem> = {
            updatedAt: new Date,
            asin, title, price, 
            deliverBy: null, 
            reviewCount: null, 
            stockCount: null,
            rating: null,
            fromNodeId: nodeId,
            fromNodePage: page
        };
        result.rating = parseFloatOrNull(item.text.match(/5つ星のうち\s*([0-9/.]+)/)?.[1]);
        result.reviewCount = parseIntOrNull(item.get(".//a[contains(@href, 'customerReviews')]")?.text);
        if(item.text.match(/明日.*?にお届け/)) {
            result.deliverBy = new Date();
            result.deliverBy.setDate(result.deliverBy.getDate() + 1);
        }
        const match = item.text.match(/([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2})\s*.*?にお届け/);
        if (match) {
            result.deliverBy = new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        }
        result.stockCount = parseIntOrNull(item.text.match(/残り([0-9]+)点/)?.[1]);
        return result;
    }).filter(notNull);
}