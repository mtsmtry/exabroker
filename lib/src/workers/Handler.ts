
export class Handler {
    inited = false;

    async init() {

    }

    async initWhenNotDone() {
        if (this.inited) {
            return;
        }
        await this.init();
        this.inited = true;
    }

    async handle(event: any, context: any): Promise<{ statusCode: number, body: string }> { 
        return {
            statusCode: 200,
            body: "Success",
        }; 
    }
}