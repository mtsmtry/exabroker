import { createTransaction } from "./Utils";
import * as yahooDriver from "../YahooDriver";
import { YahooSession } from "./YahooSession";
import { DBYahooExecution } from "../../../execution/DatabaseExecution";

export const cancelAuction = createTransaction<{
    session: YahooSession,
    aid: string
}>()
    .thenTranslate(yahooDriver.cancelAuction,
        val => ({ aid: val.aid, session: val.session.cookie }),
        (_, val) => ({ aid: val.aid }))
    .then(new DBYahooExecution((rep, val) => {
        return rep.deleteAuctionExhibit(val.aid);
    }));