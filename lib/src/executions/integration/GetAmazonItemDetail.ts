import { amazonItemDetailCollection, AMAZON_ITEM_DETAIL_VERSION } from "../../collections/AmazonItemDetailCollection";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { amazonItemDetailCrawler } from "../../crawlers/AmazonCrawler";
import { Document } from "../../system/Document";
import { AmazonItemDetail } from "../../entities/website/AmazonItemDetail";
import { getCurrentFilename } from "../../Utils";

export function getAmazonItemDetail(asin: string, body: string | null = null) {
    const s3Key = "items/" + asin;
    return Execution.transaction("Integration", getCurrentFilename())
        .then(val => DBExecution.amazon(rep => rep.getItemDetail(asin)))
        .then(detail => {
            if (detail /*&& detail.version >= AMAZON_ITEM_DETAIL_VERSION*/) {
                return Execution.resolve(detail);
            }
            return Execution.transaction()
                .then(val => {
                    return Execution.atom("Inner", "CrawlAmazonItemDetail",
                        async () => {
                            const result = await amazonItemDetailCrawler.crawl(-1, { asin }, body);
                            if (!result) {
                                throw "Failed to crawl";
                            }
                            return { result: result as AmazonItemDetail };
                        }
                    );
                });
        });
}