import { Crawler } from "../system/crawler/Crawler";
import { amazonCrawler, AmazonCrawlingObject } from "./AmazonCrawler";

export type CrawlingObject
    = { site: "Amazon", page: AmazonCrawlingObject }

export const indexCrawler =
    Crawler.branch<CrawlingObject>()
        .case(amazonCrawler, val => {
            if (val.site == "Amazon") {
                return val.page;
            } else {
                return null;
            }
        });