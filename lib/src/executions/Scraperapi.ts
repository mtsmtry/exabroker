import { WebExecution } from "../system/execution/WebExecution";

export interface ScraperapiAccount {
    concurrentRequests: number;
    requestCount: number;
    failedRequestCount: number;
    requestLimit: number;
    concurrencyLimit: number;
}

export function getAccount() {
    return WebExecution.get({
            url: "http://api.scraperapi.com/account?api_key=68d6de532946616aae283bc9fd0ea7a2"
        }, 
        doc => doc.json as ScraperapiAccount, 
        "Scraperapi",
        "GetAccount"
    );
}