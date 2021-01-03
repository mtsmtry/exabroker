import { BrowserExecution } from "../../../execution/BrowserExecution";
import { Cookie } from "../../../execution/WebExecution";
import { createWebTransaction, getFormHiddenInputData } from "./Utilts";

export const login = new BrowserExecution<{
    url: string,
    username: string,
    password: string
}>("YahooDriver", "Login")
    .navigate(val => ({ url: val.url }))
    .sendKeys(val => ({ xpath: "//*[@id='username']", keys: val.username }))
    .click(val => ({ xpath: "//*[@id='btnNext']" }))
    .sendKeys(val => ({ xpath: "//*[@id='passwd']", keys: val.password }))
    .click(val => ({ xpath: "//*[@id='btnSubmit']" }))
    .returnCookie();

export const relogin = new BrowserExecution<{
    url: string,
    password: string,
    cookie: Cookie
}>("YahooDriver", "Relogin", val => val.cookie)
    .navigate(val => ({ url: val.url }))
    .sendKeys(val => ({ xpath: "//*[@id='passwd']", keys: val.password }))
    .click(val => ({ xpath: "//*[@id='btnSubmit']" }))
    .returnCookie();