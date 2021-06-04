import { browserExecution, BrowserExecution } from "../../../../system/execution/BrowserExecution";
import { Cookie } from "../../../../system/execution/WebExecution";
import { getFormHiddenInputData } from "../../Utilts";

export function login(username: string, password: string){
    return browserExecution(undefined, "YahooDriver", "Login")
        .navigate("https://login.yahoo.co.jp/config/login")
        .sendKeys("//*[@id='username']", username)
        .click("//*[@id='btnNext']")
        .sendKeys("//*[@id='passwd']", password)
        .click("//*[@id='btnSubmit']")
        .returnCookie();
}

export function relogin(url: string, password: string, cookie: Cookie) {
    return browserExecution(cookie, "YahooDriver", "Relogin")
        .navigate(url)
        .sendKeys("//*[@id='passwd']", password)
        .click("//*[@id='btnSubmit']")
        .returnCookie();
}