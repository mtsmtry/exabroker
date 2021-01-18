import { createContainerMaintainer } from "../src/Index";

const worker = createContainerMaintainer();
worker.init().then(_ => worker.run());