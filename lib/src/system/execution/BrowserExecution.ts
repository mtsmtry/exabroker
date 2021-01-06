import { WebDriver } from "../../web/WebDriver";
import { execution, ExecutionAtom } from "./Execution";
import { TransactionExecution } from "./ExecutionComposition";
import { Cookie } from "./WebExecution";

const LAYER = "BrowserExecution";

export class BrowserExecution<T> extends TransactionExecution<T, T> {
    driver: WebDriver = new WebDriver();

    constructor(layer: string, name: string, value: T, cookie?: Cookie) {
        super(layer, name, value);
        async function promise(val: T) {
            this.driver = new WebDriver(cookie);
            return {
                result: val
            };
        }
        this.then(val => execution("BrowserExecution", "Initialize", promise(val)));
    }

    navigate(make: (val: T) => { url: string }) {
        async function promise(val: T) {
            const { url } = make(val);
            await this.driver.navigate(url);
            return {
                result: val,
                executionData: { web: { url: url } }
            };
        }
        return this.then(val => execution(LAYER, "Navigate", promise(val))) as BrowserExecution<T>;
    }

    click(make: (val: T) => { xpath: string }) {
        async function promise(val: T) {
            const { xpath } = make(val);
            const element = await this.driver.getOne(xpath);
            await element.click();
            return {
                result: val
            };
        }
        return this.then(val => execution(LAYER, "Click", promise(val))) as BrowserExecution<T>;
    }

    sendKeys(make: (val: T) => { xpath: string, keys: string }) {
        async function promise(val: T) {
            const { xpath, keys } = make(val);
            const element = await this.driver.getOne(xpath);
            await element.sendKeys(keys);
            return {
                result: val
            };
        }
        return this.then(val => execution(LAYER, "SendKeys", promise(val))) as BrowserExecution<T>;
    }

    returnCookie() {
        async function promise(val: T) {
            const cookie = await this.driver.getCookies();
            await this.driver.quit();
            return {
                result: cookie
            };
        }
        return this.then(val => execution(LAYER, "GetCookie", promise(val))) as TransactionExecution<T, Cookie>;
    }
}

export function browserExecution<T>(value: T, cookie?: Cookie, layer: string = "Inner", name: string = "Lambda") {
    return new BrowserExecution(layer, name, value, cookie);
}