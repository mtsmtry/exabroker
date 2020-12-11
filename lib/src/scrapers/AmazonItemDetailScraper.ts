import { DeepPartial } from "typeorm";
import { AmazonItem } from "../entities/AmazonItem";
import { Document, Element } from "../html/Html";
import { Dto, notNull } from "../Utils";
import { AmazonItemDetail } from "../entities/AmazonItemDetail";
import { parseFloatOrNull } from "./Utils";

type Dict = { [x: string]: string };

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

export async function scrapeAmazonItemDetail(doc: Document, asin: string): Promise<Dto<AmazonItemDetail> | null> {    
    const buybox = table_to_dict_td_td(doc.get("//*[@id='tabular-buybox']//table"));
    const merchant_buybox = { seller: buybox?.["販売元"], shipper: buybox?.["出荷元"] };
    const merchantInfo = doc.getById("merchant-info")?.text.match("この商品は、(.+)が販売し、(.+)が発送します");
    const merchant_info = { seller: merchantInfo?.[1], shipper: merchantInfo?.[2] };
    const title = doc.getById("title")?.text;
    if (!title) return null;

    return {
        asin,
        title,
        price_block: doc.getById("priceblock_ourprice")?.extractDigits() || null,
        price_swatches: doc.getById("tmmSwatches")?.extractDigits() || null,
        features_productOverview: table_to_dict_td_td(doc.get("//*[@id='productOverview_feature_div']//table")),
        features_detailBullets: doc.find("//*[@id='detailBullets_feature_div']//li").map(x => x.text.split(":")).reduce((dict: Dict, x) => ({ [x[0]]: x[1], ...dict }), {}),
        featureBullets: doc.find("//*[@id='feature-bullets']//li").map(x => x.text),
        details: table_to_dict_th_td(doc.get("//*[@id='productDetails_techSpec_section_1']")),
        productDescription: doc.getById("productDescription")?.html || null,
        shortDescription: doc.getById("postBodyPS")?.text || null,
        makerDescription: doc.getById("aplus")?.html || null,
        reviewCount: doc.getById("acrCustomerReviewText")?.extractDigits() || null,
        askCount: doc.getById("askATFLink")?.extractDigits() || null,
        rating: parseFloatOrNull(doc.getById("averageCustomerReviews")?.parent.text.match("5つ星のうち([0-9/.]+)")?.[1]),
        availability: doc.get("//*[@id='availability']/span")?.text || null,
        seller_buybox: merchant_buybox?.seller,
        shipper_buybox: merchant_buybox?.shipper,
        seller_info: merchant_info?.seller || null,
        shipper_info: merchant_info?.shipper || null,
        updatedAt: new Date()
    };
}