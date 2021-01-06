import { Cookie, WebExecution } from "../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../Utils";
import { getFormHiddenInputData } from "./Utilts";

export function removeNotices(session: Cookie, codes: string[]) {
    return WebExecution.webTransaction(arguments, "YahooDriver", getCurrentFilename())
        .setCookie(_ => session)
        .thenGet("GetFormData",
            val => ({
                url: "https://auctions.yahoo.co.jp/jp/show/myaucinfo"
            }),
            (doc, val) => ({
                codes: codes,
                form: getFormHiddenInputData(doc, "//form[@name='auctionList']")
            }))
        .thenPost("Remove",
            val => ({
                url: "https://auctions.yahoo.co.jp/jp/uconfig/removenotice",
                form:  { aidlist: val.codes, ...val.form }
            }),
            doc => null)
        .resolve(_ => ({
            valid: true,
            result: undefined
        }));
}
/*
    async removeNotices(codes: string[], formData: object) {
        console.log(`  driver:removeNotices`);
        const data = { aidlist: codes, ...formData };
        await this.client.post("https://auctions.yahoo.co.jp/jp/uconfig/removenotice", data);
    }



    async getNotices() {
        console.log(`  driver:getNotices`);
        const doc = await this.client.get("https://auctions.yahoo.co.jp/jp/show/myaucinfo");
        const notices = doc.find("//*[@id='modItemNewList']/table/tr").slice(1, -1).map(tr => {
            const code = tr.getNeeded(".//input").attrNeeded("value");
            return code.includes("payms") ? null : toNotNull({
                code,
                type: code.match("type=([a-z]+)")?.[1],
                aid: code.match("aid=([a-z0-9]+)")?.[1],
                message: tr.getNeeded(".//a").text,
                date: this.parseDate(tr.getNeeded("./td[@class='decTd05']").text)
            });
        }).filter(notNull);
        return {
            notices,
            formData: notices.length > 0 ? this.getFormHiddenInputData(doc, "//form[@name='auctionList']") : {}
        };
    }*/