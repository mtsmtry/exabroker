import { EntityManager, Repository } from "typeorm";
import { Exception, ExceptionCategory } from "../entities/Exception";

export class ExceptionRepository {
    exceptions: Repository<Exception>

    constructor(mng: EntityManager) {
        this.exceptions = mng.getRepository(Exception);
    }

    async create(message: string, category: ExceptionCategory) {
        const ex = this.exceptions.create({ message, category });
        await this.exceptions.save(ex);
    }
}