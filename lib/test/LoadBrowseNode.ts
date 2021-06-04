import { insertBrowseNodes, loadBrowseNode } from "../src/data/BrowseNodeLoader";
import { getRepositories } from "../src/system/Database";

async function main() {
    const reps = await getRepositories();
    await insertBrowseNodes(reps.amazon.browseNodes.manager, loadBrowseNode());
}

main();
