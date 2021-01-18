import * as lib from "exabroker-lib";

const maintainer = lib.createContainerMaintainer();

export async function handler(event: any, context: any) {
    await maintainer.init();
    await maintainer.run();
}