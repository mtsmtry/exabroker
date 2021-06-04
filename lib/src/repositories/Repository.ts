import { ExceptionCategory } from "../entities/system/Exception";
import { getRepositories } from "../system/Database";

export class Repository {

    async failed(ex: object) {
        const reps = await getRepositories();
        await reps.exception.create(ex.toString(), ExceptionCategory.DATABASE);
        console.log(ex);
        throw ex;
    }
}