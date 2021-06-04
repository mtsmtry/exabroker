import { AmazonItem } from "../entities/website/AmazonItem";
import { Collection } from "../system/collection/Collection";
import { BrowseNode } from "../entities/BrowseNode";
import { Document } from "../system/Document";
import { Dto, notNull } from "../Utils";
import { parseFloatOrNull, parseIntOrNull } from "../Utils";
import { DBExecution } from "../system/execution/DatabaseExecution";
import { Execution } from "../system/execution/Execution";

function saveItems(val: AmazonItem[]) {
    return DBExecution.amazon(rep => rep.upsertAmazonItems(val));
    /*return Execution.batch()
        .and(() => DBExecution.amazon(rep => rep.upsertAmazonItems(val)))
        .and(val => Execution.transaction()
            .then(() => DBExecution.amazon(rep => rep.getNoCrawledDatailASINs(val.map(x => x.asin))))
            .then(val => DBExecution.crawling(rep => rep.createTasks(val.map(asin => ({ site: "Amazon", page: { kind: "Item", asin } })))))
        )*/
}

const browseNodeCollectionHead =
    Collection.document<{ nodeId: string, page: number }>()
        .constant(val => ({ fromNodeId: val.nodeId, fromNodePage: val.page }))
        .multiple(doc => doc.find("//div[@class='a-section a-spacing-none apb-browse-searchresults-product']"))
        .propertyRequired(elm => ({ asin: elm.html.match(/dp\/([0-9A-Z]+)\//)?.[1] }))
        .propertyRequired(elm => ({ title: elm.get(".//h2")?.text.trim() }))
        .propertyRequired(elm => ({ price: elm.get(".//span[contains(@class,'a-price-whole')]")?.extractDigits() }))
        .property(elm => ({ rating: parseFloatOrNull(elm.text.match(/星5つ中の\s*([0-9/.]+)/)?.[1]) }))
        .property(elm => ({ reviewCount: elm.get(".//span[@class='a-size-small a-color-link']")?.extractDigits() }))
        .property(elm => ({ isPrime: elm.get(".//i[contains(@class,'a-icon-prime')]") != null }))
        .property(elm => {
            const deliver = elm.get(".//text()[contains(.,'お届け日:')]/..");
            if (deliver) {
                if (deliver.text.includes("明日")) {
                    return { deliverBy: getTommorow(), deliverDay: 1 };
                } 

                const match = deliver.text.match("([0-9]+)月([0-9]+)日");
                if (match) {
                    return toDateAndDays(match[1], match[2]);
                }
            }
            return { deliverBy: null, deliverDay: null };
        })
        .default({ stockCount: null })
        .saveMany(saveItems);

const browseNodeCollectionTail =
    Collection.document<{ nodeId: string, page: number }>()
        .constant(val => ({ fromNodeId: val.nodeId, fromNodePage: val.page }))
        .multiple(doc => doc.find("//*[@data-asin]"))
        .propertyRequired(elm => ({ asin: elm.attr("data-asin") }))
        .propertyRequired(elm => ({ title: elm.get(".//h2")?.text }))
        .propertyRequired(elm => ({ price: elm.get(".//span[@class='a-price-whole']")?.extractDigits() }))
        .property(elm => ({ rating: parseFloatOrNull(elm.text.match(/5つ星のうち\s*([0-9/.]+)/)?.[1]) }))
        .property(elm => ({ reviewCount: parseIntOrNull(elm.get(".//a[contains(@href, 'customerReviews')]")?.text)}))
        .property(elm => ({ isPrime: elm.get(".//i[contains(@class,'a-icon-prime')]") != null }))
        .property(elm => ({ stockCount: parseIntOrNull(elm.text.match(/残り([0-9]+)点/)?.[1]) }))
        .property(elm => {
            const deliver = elm.get("(.//div[@class='a-section a-spacing-none a-spacing-top-micro'])[last()]");
            if (deliver) {
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
            }
            return { deliverBy: null, deliverDay: null };
        })
        .saveMany(saveItems);

export const browseNodeCollection =
    Collection.branch<{ nodeId: string, page: number }>()
        .case(browseNodeCollectionHead, val => val.page == 1 ? val : null)
        .case(browseNodeCollectionTail, val => val.page > 1 ? val : null);

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