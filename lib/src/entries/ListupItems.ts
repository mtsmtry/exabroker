import { getRepositories } from "../system/Database";

async function run() {
    const reps = await getRepositories();
    const asins = await reps.integration.getExhibitableASINs(100);
    console.log(asins);
}

run()