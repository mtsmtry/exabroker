import { WebDriver } from "../web/WebDriver";
import { ExecutionAtom, TransactionExecution } from "./Execution";
import { Cookie } from "./WebExecution";

const LAYER = "BrowserExecution";

export class BrowserExecution<T> extends TransactionExecution<T, T> {
    driver: WebDriver = new WebDriver();

    constructor(layer: string, name: string, setCookie?: (val: T) => Cookie) {
        super(layer, name);
        this.then(new ExecutionAtom("BrowserExecution", "Initialize", async val => {
            const cookie = setCookie ? setCookie(val) : undefined;
            this.driver = new WebDriver(cookie);
            return {
                result: val
            };
        }));
    }

    navigate(make: (val: T) => { url: string }) {
        return this.then(new ExecutionAtom(LAYER, "Navigate", async val => {
            const { url } = make(val);
            await this.driver.navigate(url);
            return {
                result: val,
                executionData: { web: { url: url } }
            };
        })) as BrowserExecution<T>;
    }

    click(make: (val: T) => { xpath: string }) {
        return this.then(new ExecutionAtom(LAYER, "Click", async val => {
            const { xpath } = make(val);
            const element = await this.driver.getOne(xpath);
            await element.click();
            return {
                result: val
            };
        })) as BrowserExecution<T>;
    }

    sendKeys(make: (val: T) => { xpath: string, keys: string }) {
        return this.then(new ExecutionAtom(LAYER, "SendKeys", async val => {
            const { xpath, keys } = make(val);
            const element = await this.driver.getOne(xpath);
            await element.sendKeys(keys);
            return {
                result: val
            };
        })) as BrowserExecution<T>;
    }

    returnCookie() {
        return this.then(new ExecutionAtom(LAYER, "GetCookie", async val => {
            const cookie = await this.driver.getCookies();
            await this.driver.quit();
            return {
                result: cookie
            };
        })) as TransactionExecution<T, Cookie>;
    }
}