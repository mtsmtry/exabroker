import { Cookie, WebExecution } from "../../../../system/execution/WebExecution";
import { getCurrentFilename } from "../../../../Utils";

export function getIsWalletSignedUp(session: Cookie) {
    return WebExecution.get({
        url: "https://auctions.yahoo.co.jp/sell/jp/show/submit",
        cookie: session
    }, doc => doc.get("//a[@href='https://edit.wallet.yahoo.co.jp/config/wallet_signup']") != null
    , "YahooDriver", getCurrentFilename());
}