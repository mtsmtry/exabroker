import { ArbYahooAmazon } from "../../entities/integration/ArbYahooAmazon";
import { Execution } from "../../system/execution/Execution";
import { getCurrentFilename } from "../../Utils";
import { YahooSession } from "../website/yahoo/Yahoo";
import * as scraperapi from "../Scraperapi";
import * as amazon from "../website/amazon/Amazon";
import * as yahoo from "../website/yahoo/Yahoo";
import { DBExecution } from "../../system/execution/DatabaseExecution";
import { AmazonItemState } from "../../entities/website/AmazonItemState";
import { SyncMethod } from "../../entities/integration/ArbYahooAmazonSync";
import { getAuctionPrice, isExhibitableItem } from "./Algorithm";

type Arb = { id: number, aid: string, asin: string, price: number };

function revise(session: YahooSession, arb: Arb, state: AmazonItemState) {
    if (!isExhibitableItem(state)) {
        return Execution.transaction()
            .then(_ => yahoo.cancelAuction(session, arb.aid))
            .then(_ => DBExecution.integration(rep => rep.createArbSync({
                id: arb.id,
                amazonItemStateId: state.id,
                method: SyncMethod.CANCEL
            })))
    } 
    
    if (state.price) {
        const newPrice = getAuctionPrice(state.price);
        if (newPrice != arb.price) {
            return Execution.transaction()
                .then(_ => yahoo.changeAuctionPrice(session, arb.aid, newPrice))
                .then(_ => DBExecution.integration(rep => rep.createArbSync({
                    id: arb.id,
                    amazonItemStateId: state.id,
                    method: SyncMethod.CHANGE_PRICE,
                    oldPrice: arb.price,
                    newPrice: newPrice
                })));
        }
    }
    return Execution.cancel();
}

function process(session: YahooSession, arbs: Arb[]) {
    return Execution.transaction()
        .then(val => scraperapi.getAccount())
        .then(val => Execution.transaction()
            .then(_ => Execution.sequence<Arb, { arb: Arb, state: AmazonItemState }>(arbs.slice(0, val.concurrencyLimit))
                .element(arb => amazon.getItemStateWithProxy(arb.asin).map(state => ({ arb, state })))
            )
            .then(val => Execution.sequence(val)
                .element(val => revise(session, val.arb, val.state)))
            .then(_ => {
                const result = arbs.slice(val.concurrencyLimit);
                return Execution.resolve({ result, continue: result.length > 0 });
            })
        )
}

export function reviseAuction(session: YahooSession) {
    return Execution.transaction("Integration", getCurrentFilename())
        .then(val => Execution.batch()
            .and(() => scraperapi.getAccount())
            .and(() => DBExecution.integration(rep => rep.getExhibitCount()).map(val => ({ exhibitCount: val })))
        )
        .then(val => {
            // 今月の残り日数
            const days = 30 - (new Date()).getDate();
            // 1日当たりにアクセス可能な数
            const dayLimit = (val.requestLimit - val.requestCount) / days;
            // 1つのオークションを何日置きにアクセスできるか
            const checkDays = dayLimit / val.exhibitCount;
            // 1つのオークションを何分置きにアクセスできるか
            const checkSeconds = checkDays * 24 * 3600;
            return DBExecution.integration(rep => rep.getArbsNotChecked(checkSeconds)).map(arbs => ({ arbs, info: val }));
        })
        .then(all => Execution.loop(all.arbs).routine(val => process(session, val)));
}