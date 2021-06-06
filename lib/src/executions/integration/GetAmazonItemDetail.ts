import { amazonItemDetailCollection, AMAZON_ITEM_DETAIL_VERSION } from "../../collections/AmazonItemDetailCollection";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { Execution } from "../../system/execution/Execution";
import { amazonItemDetailCrawler } from "../../crawlers/AmazonCrawler";
import { Document } from "../../system/Document";
import { AmazonItemDetail } from "../../entities/website/AmazonItemDetail";
import { getCurrentFilename } from "../../Utils";

export function getAmazonItemDetail(asin: string) {
    const s3Key = "items/" + asin;
    return Execution.transaction("Integration", getCurrentFilename())
        .then(val => DBExecution.amazon(rep => rep.getItemDetail(asin)))
        .then(detail => {
            if (detail /*&& detail.version >= AMAZON_ITEM_DETAIL_VERSION*/) {
                return Execution.resolve(detail);
            }
            return Execution.transaction()
                .then(val => DBExecution.s3(rep => {
                    return rep.getObject({ Bucket: "exabroker-crawled", Key: s3Key }).promise().catch(ex => {
                        if ((ex.toString() as string).includes("NoSuchKey")) {
                            return null;
                        } else {
                            throw ex;
                        }
                    })
                }))
                .then(val => {
                    if (!val) {
                        return Execution.atom("Inner", "CrawlAmazonItemDetail",
                            async () => amazonItemDetailCrawler.crawl(-1, { asin }).then(result => ({ result }))
                        ).mustBeNotNull();
                    }
                    return Execution.resolve((val.Body as Buffer).toString());
                })
                .then(val => Execution.atom("", "", async () => {
                    const doc = new Document(val);
                    const result = await amazonItemDetailCollection.collectItems(doc, { asin }, s3Key);
                    if (result.result == null) {
                        throw "Failed to crawl";
                    }
                    return { result: result.result as AmazonItemDetail };
                }));
        });
}