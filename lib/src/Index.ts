import { CollectionHandler } from "./workers/CollectionHandler";
import { ContainerMaintainer } from "./workers/ContainerMaintainer";
import { CrawlingContainer } from "./workers/CrawlingContainer";
import { CrawlingScheduler } from "./workers/CrawlingScheduler";
import { ExecutionContainer } from "./workers/ExecutionContainer";
import { Handler } from "./workers/Handler";
import { Worker } from "./workers/Worker";

export function createContainerMaintainer(): Worker {
    return new ContainerMaintainer();
}

export function createCrawlingContainer(): Worker {
    return new CrawlingContainer();
}

export function createCrawlingScheduler(): Worker {
    return new CrawlingScheduler();
}

export function createExecutionContainer(): Worker {
    return new ExecutionContainer();
}

export function createCollectionHandler(): Handler {
    return new CollectionHandler();
}