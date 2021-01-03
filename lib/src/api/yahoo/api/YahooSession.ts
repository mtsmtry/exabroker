import { YahooAccount } from "../../../entities/YahooAccount";
import { Cookie } from "../../../execution/WebExecution";

export class YahooSession {
    cookie: Cookie;
    account: YahooAccount
}