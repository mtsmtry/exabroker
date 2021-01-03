import { createTransaction } from "./Utils";
import { YahooSession } from "./YahooSession";
import * as yahooDriver from "../YahooDriver";
import { DBYahooExecution } from "../../../execution/DatabaseExecution";

export const syncNotices = createTransaction<{
    session: YahooSession
}>()
    .thenTranslate(yahooDriver.getNotices,
        val => ({
            session: val.session.cookie
        }),
        (res, val) => ({ notices: res, ...val }))
    .thenTranslate(new DBYahooExecution((rep, val: any) => {
        return rep.saveNotices(val.session.account.username, val.notices);
    }), val => val, (res, val) => val)
    .thenTranslate(yahooDriver.removeNotices,
        val => ({
            session: val.session.cookie,
            codes: val.notices.map(x => x.code)
        }), _ => undefined);