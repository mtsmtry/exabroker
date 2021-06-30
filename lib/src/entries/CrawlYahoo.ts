import { getRepositories } from "../system/Database";
import { DBExecution } from "../system/execution/DatabaseExecution";
import { Execution } from "../system/execution/Execution";
import * as yahooDriver from "../executions/website/yahoo/YahooDriver";

function run() {
    return Execution.loop({}).routine(_ => Execution.transaction()
        .then(_ => DBExecution.integration(rep => rep.hasNoYahooAuctionHistoryAmazonItems(10)))
        .then(val => Execution.sequence(val, 10)
            .element(val => Execution.transaction()
                .then(_ => yahooDriver.searchAuctionHistory(val.title))
                .then(result => DBExecution.integration(rep => rep.upsertAuctionHistory(val.asin, result.dealCount)))
            )
        )
        .then(val => Execution.resolve({ result: {}, continue: val.length > 0 })));
}

run().execute();
process.exit();