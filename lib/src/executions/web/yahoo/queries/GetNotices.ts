import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename, notNull, toNotNull } from "../../../../Utils";

function parseDate(date: string) {
    // ex: 2020年 12月 26日 13時 21分
    const m = date.match("([0-9]+)年 ([0-9]+)月 ([0-9]+)日 ([0-9]+)時 ([0-9]+)分");
    if (!m) {
        throw "Do not match date format";
    }
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), parseInt(m[4]), parseInt(m[5]));
}

export function getNotices(session: Cookie) {
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/jp/show/myaucinfo",
        cookie: session
    }, doc => {
        return doc.find("//*[@id='modItemNewList']/table/tr").slice(1, -1).map(tr => {
            const code = tr.getNeeded(".//input").attrNeeded("value");
            return code.includes("payms") ? null : toNotNull({
                code,
                type: code.match("type=([a-z]+)")?.[1],
                aid: code.match("aid=([a-z0-9]+)")?.[1],
                message: tr.getNeeded(".//a").text,
                date: parseDate(tr.getNeeded("./td[@class='decTd05']").text)
            });
        }).filter(notNull);
    }, "YahooDriver", getCurrentFilename());
}