import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export const removeNotices = createWebTransaction<{
    session: Cookie,
    codes: string[]
}>()
    .setCookie(val => val.session)
    .thenGet("GetFormData",
        val => ({
            url: "https://auctions.yahoo.co.jp/jp/show/myaucinfo"
        }),
        (doc, val) => ({
            codes: val.codes,
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
        result: null
    }));
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