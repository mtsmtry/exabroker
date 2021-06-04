import { browserExecution } from "../../../../system/execution/BrowserExecution";
import { Cookie, WebTransaction } from "../../../../system/execution/WebExecution";

export function login(email: string, password: string){  
    let url = "https://www.amazon.co.jp/ap/signin?openid.return_to=https://www.amazon.co.jp/?ref_=nav_ya_signin";
    url += "&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.assoc_handle=jpflex";
    url += "&openid.mode=checkid_setup&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select";
    url += "&openid.ns=http://specs.openid.net/auth/2.0&&openid.pape.max_auth_age=0";

    return browserExecution(undefined, "AmazonDriver", "Login")
        .navigate(url)
        .sendKeys("//*[@id='ap_email']", email)
        .click("//*[@id='continue']")
        .sendKeys("//*[@id='ap_password']", password)
        .click("//*[@name='rememberMe']")
        .click("//*[@id='signInSubmit']")
        .returnCookie();
}

export function relogin(url: string, password: string, cookie: Cookie) {
    return browserExecution(cookie, "AmazonDriver", "Relogin")
        .navigate(url)
        .sendKeys("//*[@id='ap_password']", password)
        .click("//*[@name='rememberMe']" )
        .click("//*[@id='signInSubmit']" )
        .returnCookie();
}