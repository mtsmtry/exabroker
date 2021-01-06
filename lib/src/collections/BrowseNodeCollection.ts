import { AmazonItem } from "../entities/AmazonItem";
import { Collection } from "../system/collection/Collection";
import { BrowseNode } from "../entities/BrowseNode";
import { Document } from "../web/WebClient";
import { Dto, notNull } from "../Utils";
import { parseFloatOrNull, parseIntOrNull } from "../Utils";

export const browseNodeCollection: Collection<AmazonItem> =
    Collection.from()
        .items(doc => doc.find("//*[@data-asin]"))
        .property(elm => ({ asin: elm.attr("data-asin") }))
        .property(elm => ({ title: elm.get(".//h2")?.text }))
        .property(elm => ({ price: elm.get(".//span[@class='a-price-whole']")?.extractDigits() }))
        .property(elm => ({ rating: parseFloatOrNull(elm.text.match(/5つ星のうち\s*([0-9/.]+)/)?.[1]) }))
        .property(elm => ({ reviewCount: parseIntOrNull(elm.get(".//a[contains(@href, 'customerReviews')]")?.text)}))
        .property(elm => ({ isPrime: elm.get(".//i[contains(@class,'a-icon-prime')]") != null }))
        .property(elm => ({ stockCount: parseIntOrNull(elm.text.match(/残り([0-9]+)点/)?.[1]) }))
        .property(elm => {
            const deliver = elm.get("(.//div[@class='a-section a-spacing-none a-spacing-top-micro'])[last()]");
            if (!deliver) {
                return { deliverBy: null, deliverDay: null };
            }
            if(deliver.text.includes("明日")) {
                return { deliverBy: getTommorow(), deliverDay: 1 };
            }

            let match = deliver.text.match("[^0-9]([0-9]{1,2})/([0-9]{1,2})");
            if (match) {
                return toDateAndDays(match[1], match[2]);
            }
            
            match = deliver.text.match("([0-9]{1,2})月([0-9]{1,2})日");
            if (match) {
                return toDateAndDays(match[1], match[2]);
            }

            return { deliverBy: null, deliverDay: null };
        })
        .resolve();

const browseNodeCollection2: Collection<AmazonItem> =
    Collection.from()
        .items(doc => doc.find("//div[@class='a-section a-spacing-none apb-browse-searchresults-product']"))
        .property(elm => ({ asin: elm.html.match(/dp\/([0-9A-Z]+)\//)?.[1] }))
        .property(elm => ({ title: elm.get(".//h2")?.text.trim() }))
        .property(elm => ({ price: elm.get(".//span[contains(@class,'a-price-whole')]")?.extractDigits() }))
        .property(elm => ({ rating: parseFloatOrNull(elm.text.match(/星5つ中の\s*([0-9/.]+)/)?.[1]) }))
        .property(elm => ({ reviewCount: elm.get(".//span[@class='a-size-small a-color-link']")?.extractDigits() }))
        .property(elm => ({ isPrime: elm.get(".//i[contains(@class,'a-icon-prime')]") != null }))
        .property(elm => {
            const deliver = elm.get(".//text()[contains(.,'お届け日:')]/..");
            if (!deliver) {
                return { deliverBy: null, deliverDay: null };
            }
            if (deliver.text.includes("明日")) {
                return { deliverBy: getTommorow(), deliverDay: 1 };
            } 
            
            const match = deliver.text.match("([0-9]+)月([0-9]+)日");
            if (match) {       
                return toDateAndDays(match[1], match[2]);
            }

            return { deliverBy: null, deliverDay: null };
        })

    export async function scrapeBrowseNodePageFirst(doc: Document, nodeId: string, page: number): Promise<Dto<AmazonItem>[]> {
        const items = doc.find("//div[@class='a-section a-spacing-none apb-browse-searchresults-product']");
        return items.map(item => {
            const asin = item.html.match(/dp\/([0-9A-Z]+)\//)?.[1];
            const title = item.get(".//h2")?.text.trim();
            const price = item.get(".//span[contains(@class,'a-price-whole')]")?.extractDigits();
            if (!title || !asin || !price) {
                return null;
            }
            const result: Dto<AmazonItem> = {
                updatedAt: new Date,
                asin, title, price, 
                deliverBy: null, 
                deliverDay: null,
                reviewCount: null, 
                stockCount: null,
                rating: null,
                fromNodeId: nodeId,
                fromNodePage: page,
                isCrawledDetail: false,
                isPrime: false
            };
            result.rating = parseFloatOrNull(item.text.match(/星5つ中の\s*([0-9/.]+)/)?.[1]);
            result.reviewCount = item.get(".//span[@class='a-size-small a-color-link']")?.extractDigits() || null;
    
            result.isPrime = item.get(".//i[contains(@class,'a-icon-prime')]") != null;
    
            return result;
        }).filter(notNull);
    }

export class BrowseNodeCollection extends Collection<AmazonItem> {
    constructor() {
    }

    getItems() {

    }
}


export async function scrapeBrowseNodeItemCount(doc: Document, page: number) {
    if (page == 1) {
        const items = doc.find("//div[@class='a-section a-spacing-none apb-browse-searchresults-product']");
        return items.length;
    } else {
        const items = doc.find("//*[@data-asin]");
        return items.length;
    }
}

export async function scrapeBrowseNode(doc: Document, nodeId: string, page: number): Promise<Dto<AmazonItem>[]> {
    if (page == 1) {
        return await scrapeBrowseNodePageFirst(doc, nodeId, page);
    } else {
        return await scrapeBrowseNodePageOther(doc, nodeId, page);
    }
}

export async function scrapeBrowseNodePageOther(doc: Document, nodeId: string, page: number): Promise<Dto<AmazonItem>[]> {
    const items = doc.find("//*[@data-asin]");
    return items.map(item => {
        const asin = item.attr("data-asin");
        const title = item.get(".//h2")?.text;
        const price = item.get(".//span[@class='a-price-whole']")?.extractDigits();
        if (!title || !asin || !price) {
            return null;
        }
        const result: Dto<AmazonItem> = {
            updatedAt: new Date,
            asin, title, price, 
            deliverBy: null, 
            deliverDay: null,
            reviewCount: null, 
            stockCount: null,
            rating: null,
            fromNodeId: nodeId,
            fromNodePage: page,
            isCrawledDetail: false,
            isPrime: false
        };
        result.rating = parseFloatOrNull(item.text.match(/5つ星のうち\s*([0-9/.]+)/)?.[1]);
        result.reviewCount = parseIntOrNull(item.get(".//a[contains(@href, 'customerReviews')]")?.text);
        
        result.isPrime = item.get(".//i[contains(@class,'a-icon-prime')]") != null;

        const deliver = item.get("(.//div[@class='a-section a-spacing-none a-spacing-top-micro'])[last()]");
        if (deliver) {
            if(deliver.text.includes("明日")) {
                result.deliverBy = getTommorow();
                result.deliverDay = 1;
            } else {
                const match = deliver.text.match("[^0-9]([0-9]{1,2})/([0-9]{1,2})");
                if (match) {
                    [result.deliverBy, result.deliverDay] = toDateAndDays(match[1], match[2]);
                }
                else {
                    const match = deliver.text.match("([0-9]{1,2})月([0-9]{1,2})日");
                    if (match) {
                        [result.deliverBy, result.deliverDay] = toDateAndDays(match[1], match[2]);
                    }
                }
            }
        }
        result.stockCount = parseIntOrNull(item.text.match(/残り([0-9]+)点/)?.[1]);
        return result;
    }).filter(notNull);
}


function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTommorow() {
    const date = getToday();
    date.setDate(date.getDate() + 1);
    return date;
}

function toDateAndDays(monthStr: string, dayStr: string) {
    const today = getToday();
    let year = today.getFullYear();
    const month = parseInt(monthStr) - 1, day = parseInt(dayStr);
    if (today.getMonth() == 11 && month == 0) {
        year++;
    }                    
    const date = new Date(year, month, day);
    const days = (date.getTime() - today.getTime()) / 86400000;
    return { deliverBy: date, deliverDay: days };
}