import * as lib from "../src/Index";

const worker = lib.createCrawlingScheduler();
worker.init().then(_ => worker.run());