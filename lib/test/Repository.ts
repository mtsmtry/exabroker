import { getRepositories } from "../src/system/Database";

async function main() {
    const reps = await getRepositories();
    const asins = await reps.integration.getExhibitableASINs(1000);
    console.log(asins);
}

main();