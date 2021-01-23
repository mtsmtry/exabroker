import { DeepPartial } from "typeorm";
import { AmazonItem } from "../entities/AmazonItem";
import { Document, Element } from "../system/Document";
import { Dto, notNull } from "../Utils";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { parseFloatOrNull } from "../Utils";
import { Collection } from "../system/collection/Collection";
import { DBExecution } from "../system/execution/DatabaseExecution";
import { getRepositories } from "../system/Database";
import { indexCrawler } from "../crawlers/IndexCrawler";

export const AMAZON_ITEM_DETAIL_VERSION = 3;

type Dict = { [x: string]: string };

export const amazonItemDetailCollection =
    Collection.document<{ asin: string }>()
        .constant(val => val)
        .single()
        .propertyRequired(doc => ({ title: doc.getById("title")?.text }))
        .property(doc => {
            const merchantInfo = doc.get("merchant-info")?.text.match("この商品は、(.+)が販売し、(.+)が発送します");
            return { merchant_seller: merchantInfo?.[1], merchant_shipper: merchantInfo?.[2] };
        })
        .property(doc => {
            const buybox = table_to_dict_td_td(doc.get("//*[@id='tabular-buybox']//table"));
            return { buybox_seller: buybox?.["販売元"], buybox_shipper: buybox?.["出荷元"] };
        })
        .property(doc => ({ price_block: doc.getById("priceblock_ourprice")?.extractDigits() }))
        .property(doc => ({ price_swatches: doc.getById("tmmSwatches")?.extractDigits() }))
        .property(doc => ({ features_productOverview: table_to_dict_td_td(doc.get("//*[@id='productOverview_feature_div']//table")) }))
        .property(doc => ({ features_detailBullets:
            doc .find("//*[@id='detailBullets_feature_div']//li")
                .map(x => x.text.split(":"))
                .reduce((dict: Dict, x) => ({ [x[0]]: x[1], ...dict }), {})}))
        .property(doc => ({ featureBullets: doc.find("//*[@id='feature-bullets']//li").map(x => x.text) }))
        .property(doc => ({ details: table_to_dict_th_td(doc.get("//*[@id='productDetails_techSpec_section_1']")) }))
        .property(doc => ({ productDescription: doc.getById("productDescription")?.html }))
        .property(doc => ({ shortDescription: doc.getById("postBodyPS")?.text  }))
        .property(doc => ({ makerDescription: doc.getById("aplus")?.html }))
        .property(doc => ({ reviewCount: doc.getById("acrCustomerReviewText")?.extractDigits() }))
        .property(doc => ({ askCount: doc.getById("askATFLink")?.extractDigits()  }))
        .property(doc => ({ rating: parseFloatOrNull(doc.getById("averageCustomerReviews")?.parent.text.match("5つ星のうち([0-9/.]+)")?.[1]) }))
        .property(doc => ({ availability: doc.get("//*[@id='availability']/span")?.text }))
        .property(doc => ({ images: doc.find("//*[@id='altImages']//img").map(x => x.attr("src")?.match("(.+?)\.[0-9a-zA-Z_]+\.jpg")?.[1] + ".jpg") }))
        .property(doc => ({ version: AMAZON_ITEM_DETAIL_VERSION }))
        .saveOne(val => DBExecution.amazon(rep => rep.upsertAmazonItemDetail(val)))

function table_to_dict_td_td(table: Element | null) {
    if (!table) {
        return {};
    }
    return table.find("tr").reduce((dict: Dict, tr) => {
        const [key, value] = tr.find("td");
        dict[key.text] = value.text;
        return dict;
    }, {});
}

function table_to_dict_th_td(table: Element | null) {
    if (!table) {
        return null;
    }
    return table.find("tr").reduce((dict: Dict, tr) => {
        const key = tr.get("th");
        const value = tr.get("td");
        if (key && value) {
            dict[key.text] = value.text;
        }
        return dict;
    }, {});
}

export async function getLatestVersionAmazonItemDetail(asin: string) {
    const reps = await getRepositories();
    const item = await reps.amazon.getItem(asin);
    if (!item) {
        return undefined;
    }
    let detail = await reps.amazon.getItemDetail(asin);
    if (!detail || detail.version < AMAZON_ITEM_DETAIL_VERSION) {
        if (!item) {
            return undefined;
        }

        const s3Key = "items/" + asin;        
        let object = await reps.s3.getObject({ Bucket: "exabroker-crawled", Key: s3Key }).promise();

        if (object.$response.error && object.$response.error.code == "NotFound") {
            await indexCrawler.crawl(-1, { site: "Amazon", page: { kind: "Item", asin: asin } });
            object = await reps.s3.getObject({ Bucket: "exabroker-crawled", Key: s3Key }).promise();
        }

        const body = object.Body as Buffer;
        const doc = new Document(body.toString());
        const res = await amazonItemDetailCollection.collectItems(doc, s3Key);
        if (res.result == null) {
            throw "Failed to crawl";
        }
        detail = res.result as AmazonItemDetail;
    }
    detail.item = item;

    return detail;
}