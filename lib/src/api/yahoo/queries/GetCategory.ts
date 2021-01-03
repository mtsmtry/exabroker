import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction } from "./Utils";

export interface YahooAuctionCategory {
    id: number;
    name: string;
    path: string;
    depth: number;
    isAdult: boolean;
}

function parseJSONP(jsonp) {
    return JSON.parse(jsonp.slice(7, -1));
}

export const getCategory = createWebTransaction<{ 
    session: Cookie,
    keyword: string 
}>()
    .setCookie(x => x.session)
    .thenGet("GetApplicationId",
        val => ({
            url: "https://auctions.yahoo.co.jp/sell/jp/show/topsubmit",
            params: { select: "flea_market" }
        }),
        (doc, val) => ({
            eappid: doc.getNeeded("//*[@name='eappid']").attrNeeded("value"),
            keyword: val.keyword
        }))
    .thenGet("Query",
        val => ({
            url: "https://auctions.yahooapis.jp/AuctionWebService/V1/categorySuggest",
            params: { q: val.keyword, eappid: val.eappid, output: "json" }
        }),
        doc => {
            const json = parseJSONP(doc.buffer.toString());
            return json.ResultSet.Result.CategoryList.Category.map(x => ({
                id: parseInt(x.CategoryId),
                name: x.CategoryName.trim(),
                path: x.CategoryPath.trim(),
                depth: parseInt(x.Depth),
                isAdult: parseInt(x.IsAdult) > 0,
            })) as YahooAuctionCategory[];
        });
        
        /*

    async getCategory(keyword: string): Promise<YahooAuctionCategory[]> {
        console.log(`  driver:getCategory ${keyword}`);

        // Get AuctionWebService application id
        let doc = await this.client.get("https://auctions.yahoo.co.jp/sell/jp/show/topsubmit?select=flea_market");
        const eappid = doc.getNeeded("//*[@name='eappid']").attrNeeded("value");
        function parseJSONP(jsonp) {
            return JSON.parse(jsonp.slice(7, -1));
        }

        // Query categorySuggest
        const query = { q: keyword, eappid, output: "json" };
        doc = await this.client.get("https://auctions.yahooapis.jp/AuctionWebService/V1/categorySuggest", query);
        const json = parseJSONP(doc.buffer.toString());
        return json.ResultSet.Result.CategoryList.Category.map(x => {
            return {
                id: parseInt(x.CategoryId),
                name: x.CategoryName.trim(),
                path: x.CategoryPath.trim(),
                depth: parseInt(x.Depth),
                isAdult: parseInt(x.IsAdult) > 0,
            }
       */