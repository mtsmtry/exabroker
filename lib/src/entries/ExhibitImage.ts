import {exhibitimage} from "../executions/apps/ExhibitImage";


async function run() {
    console.log("Exhibit Image: START");

    await exhibitimage().execute();
}

run();
