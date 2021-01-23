import { WebDriver } from "../WebDriver";
import { Execution, TransactionExecution } from "./Execution";
import { Cookie } from "./WebExecution";

const LAYER = "BrowserExecution";

export class BrowserExecution extends TransactionExecution<{}, WebDriver> {
    constructor(layer: string, name: string, cookie?: Cookie) {
        super(layer, name, {});
        async function promise(webDriver: WebDriver) {
            return {
                result: new WebDriver(cookie)
            };
        }
        this.then(val => Execution.atom("BrowserExecution", "Initialize", () => promise(val)));
    }

    navigate(make: (val: WebDriver) => { url: string }) {
        async function promise(webDriver: WebDriver) {
            const { url } = make(webDriver);
            await webDriver.navigate(url);
            return {
                result: webDriver,
                executionData: { web: { url: url } }
            };
        }
        return this.then(val => Execution.atom(LAYER, "Navigate", () => promise(val))) as BrowserExecution;
    }

    click(make: (val: WebDriver) => { xpath: string }) {
        async function promise(webDriver: WebDriver) {
            const { xpath } = make(webDriver);
            const element = await this.driver.getOne(xpath);
            await element.click();
            return {
                result: webDriver
            };
        }
        return this.then(val => Execution.atom(LAYER, "Click", () => promise(val))) as BrowserExecution;
    }

    sendKeys(make: (val: WebDriver) => { xpath: string, keys: string }) {
        async function promise(webDriver: WebDriver) {
            const { xpath, keys } = make(webDriver);
            const element = await this.driver.getOne(xpath);
            await element.sendKeys(keys);
            return {
                result: webDriver
            };
        }
        return this.then(val => Execution.atom(LAYER, "SendKeys", () => promise(val))) as BrowserExecution;
    }

    returnCookie() {
        async function promise(webDriver: WebDriver) {
            const cookie = await this.driver.getCookies();
            await this.driver.quit();
            return {
                result: cookie
            };
        }
        return this.then(val => Execution.atom(LAYER, "GetCookie", () => promise(val))) as TransactionExecution<{}, Cookie>;
    }
}

export function browserExecution<T>(cookie?: Cookie, layer: string = "Inner", name: string = "Lambda") {
    return new BrowserExecution(layer, name, cookie);
}