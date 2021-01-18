import * as aws from "aws-sdk";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { ExecutionRepository } from "../repositories/ExecutionRepository";
import * as scraperapi from "../executions/Scraperapi";
import { Worker } from "./Worker";
import { getRepositories } from "../system/Database";

const cluster = "exabroker-cluster";
const executionTaskFamily = "exabroker-executer";
const crawlingTaskFamily = "exabroker-crawler";

const networkConfiguration: aws.ECS.NetworkConfiguration = {
    awsvpcConfiguration: {
        subnets: ["subnet-03d6cea7114eedbb2", "subnet-00905ecbc0b33fff0", "subnet-0e5d6667b766db9f3"],
        securityGroups: ["sg-072027072de38ce19"],
        assignPublicIp: "ENABLED"
    }
};

const executionTask: aws.ECS.Types.RunTaskRequest = {
    cluster,
    count: 1,
    taskDefinition: "exabroker-executer",
    launchType: "FARGATE",
    networkConfiguration
};

const crawlingTask: aws.ECS.Types.RunTaskRequest = {
    cluster,
    count: 1,
    taskDefinition: "exabroker-crawler",
    launchType: "FARGATE",
    networkConfiguration
};

export class ContainerMaintainer extends Worker {
    execRep: ExecutionRepository;
    crawlingRep: CrawlingRepository;
    ecs: aws.ECS;

    async init() {
        const reps = await getRepositories();
        this.execRep = reps.execution;
        this.crawlingRep = reps.crawling;
        this.ecs = new aws.ECS();
    }

    async maintainExecutionContainer() {
        await this.execRep.createTaskOnSchedule();
        const listTasks = await this.ecs.listTasks({ cluster, family: executionTaskFamily, desiredStatus: "RUNNING" }).promise();
        if (!listTasks.taskArns || listTasks.taskArns.length == 0) {
            await this.execRep.stopAllRunningTasks();
            if (await this.execRep.existsTask()) {
                await this.ecs.runTask(executionTask).promise();
            }
        }
    }

    async maintainCrawlingContainer() {
        const listTasks = await this.ecs.listTasks({ cluster, family: crawlingTaskFamily, desiredStatus: "RUNNING" }).promise();
        console.log(`Running task count:${listTasks.taskArns?.length}`);
        if (!listTasks.taskArns || listTasks.taskArns.length == 0) {
            if (await this.crawlingRep.existsTask()) {
                console.log("Task exists");
                const account = await scraperapi.getAccount().execute();
                if (account.requestCount < account.requestLimit) {
                    console.log("Run a task");
                    await this.ecs.runTask(crawlingTask).promise();
                }
            }
        }
    }

    async run() {
        await this.maintainCrawlingContainer();
       // await Promise.all([this.maintainExecutionContainer(), this.maintainCrawlingContainer()]);
    }
}