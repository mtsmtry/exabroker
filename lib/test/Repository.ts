import { getRepositories } from "../src/system/Database";

async function main() {
    const reps = await getRepositories();
    const asins = await reps.amazon.getExhibitableASINs(1000);
    console.log(asins);
}

main();