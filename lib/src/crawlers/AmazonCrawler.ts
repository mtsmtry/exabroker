import { amazonItemDetailCollection } from "../collections/AmazonItemDetailCollection";
import { browseNodeCollection } from "../collections/BrowseNodeCollection";
import { Crawler } from "../system/crawler/Crawler";
import { CrawlingObject } from "./IndexCrawler";

export type AmazonCrawlingObject
    = { kind: "BrowseNode", nodeId: string, page: number }
    | { kind: "Item", asin: string }

const browseNodeCrawler =
    Crawler.page<{ nodeId: string, page: number }>({
        getUrl: val => `https://www.amazon.co.jp/s?rh=n%3A${val.nodeId}&page=${val.page}`,
        getS3Key: val => `browseNodes/${val.nodeId}-${val.page}`,
        getNextCrawlings: (val, itemCount) => {
            if (itemCount < 10) {
                return [];
            }
            const page: AmazonCrawlingObject = { kind: "BrowseNode", nodeId: val.nodeId, page: val.page + 1 };
            const next: CrawlingObject = { site: "Amazon", page };
            return [next];
        },
        collection: browseNodeCollection
    });

export const amazonItemDetailCrawler =
    Crawler.page<{ asin: string }>({
        getUrl: val => `https://www.amazon.co.jp/dp/${val.asin}`,
        getS3Key: val => `items/${val.asin}`,
        getNextCrawlings: _ => [],
        collection: amazonItemDetailCollection
    });

export const amazonCrawler =
    Crawler.branch<AmazonCrawlingObject>()
        .case(browseNodeCrawler, val => {
            if (val.kind == "BrowseNode") {
                return { nodeId: val.nodeId, page: val.page };
            } else {
                return null;
            }
        })
        .case(amazonItemDetailCrawler, val => {
            if (val.kind == "Item") {
                return { asin: val.asin };
            } else {
                return null;
            }
        })