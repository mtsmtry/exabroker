import { sleep } from "../../Utils";
import { WebDriver } from "../WebDriver";
import { Execution, LogType, TransactionExecution } from "./Execution";
import { Cookie } from "./WebExecution";

const LAYER = "BrowserExecution";

export class BrowserExecution extends TransactionExecution<{}, WebDriver> {
    constructor(layer: string, name: string, cookie?: Cookie) {
        super(layer, name, {});
        async function promise(val: {}) {
            return {
                result: new WebDriver(cookie)
            };
        }
        this.then(val => Execution.atom("BrowserExecution", "Initialize", () => promise(val), LogType.ON_FAILURE_ONLY));
    }

    navigate(url: string) {
        async function promise(webDriver: WebDriver) {
            await webDriver.navigate(url);
            return {
                result: webDriver,
                executionData: { web: { document: await webDriver.getHtml(), url: url.slice(0, 255) } }
            };
        }
        return this.then(val => Execution.atom(LAYER, "Navigate", () => promise(val), LogType.ON_FAILURE_ONLY)) as BrowserExecution;
    }

    click(xpath: string) {
        async function promise(webDriver: WebDriver) {
            const element = await webDriver.getOne(xpath);
            await element.click();
            return {
                result: webDriver
            };
        }
        return this.then(val => Execution.atom(LAYER, "Click", () => promise(val), LogType.ON_FAILURE_ONLY)) as BrowserExecution;
    }

    submitElement(xpath: string) {
        async function promise(webDriver: WebDriver) {
            const element = await webDriver.getOne(xpath);
            await element.submit();
            return {
                result: webDriver
            };
        }
        return this.then(val => Execution.atom(LAYER, "Submit", () => promise(val), LogType.ON_FAILURE_ONLY)) as BrowserExecution;
    }

    sendKeys(xpath: string, keys: string) {
        async function promise(webDriver: WebDriver) {
            const element = await webDriver.getOne(xpath);
            await element.sendKeys(keys);
            return {
                result: webDriver
            };
        }
        return this.then(val => Execution.atom(LAYER, "SendKeys", () => promise(val), LogType.ON_FAILURE_ONLY)) as BrowserExecution;
    }

    returnCookie() {
        async function promise(webDriver: WebDriver) {
            const cookie = await webDriver.getCookies();
            await webDriver.quit();
            return {
                result: cookie
            };
        }
        return this.then(val => Execution.atom(LAYER, "GetCookie", () => promise(val), LogType.ON_FAILURE_ONLY)) as TransactionExecution<{}, Cookie>;
    }
}

export function browserExecution<T>(cookie?: Cookie, layer: string = "Inner", name: string = "Lambda") {
    return new BrowserExecution(layer, name, cookie);
}