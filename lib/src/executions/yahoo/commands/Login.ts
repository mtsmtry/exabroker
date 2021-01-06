import { browserExecution, BrowserExecution } from "../../../system/execution/BrowserExecution";
import { Cookie } from "../../../system/execution/WebExecution";
import { getFormHiddenInputData } from "./Utilts";

export function login(username: string, password: string){
    return browserExecution(arguments, undefined, "YahooDriver", "Login")
        .navigate(val => ({ url: "https://login.yahoo.co.jp/config/login" }))
        .sendKeys(val => ({ xpath: "//*[@id='username']", keys: username }))
        .click(val => ({ xpath: "//*[@id='btnNext']" }))
        .sendKeys(val => ({ xpath: "//*[@id='passwd']", keys: password }))
        .click(val => ({ xpath: "//*[@id='btnSubmit']" }))
        .returnCookie();
}

export function relogin(url: string, password: string, cookie: Cookie) {
    return browserExecution(arguments, cookie, "YahooDriver", "Relogin")
        .navigate(val => ({ url }))
        .sendKeys(val => ({ xpath: "//*[@id='passwd']", keys: password }))
        .click(val => ({ xpath: "//*[@id='btnSubmit']" }))
        .returnCookie();
}