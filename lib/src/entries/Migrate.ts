import { getRepositories } from "../system/Database";

async function run() {
    const reps = await getRepositories();
}

run();