// worker/prisma.ts
import { PrismaClient, ZapRunStatus } from "@prisma/client";
import { consumer } from "./kafka";
import { sendEmail } from "./mailer";
import { allConditionsPassed, replaceFunction } from "./utils/utils";

const prisma = new PrismaClient();
const TOPIC_NAME = "zap-events";





const logError = async(zapRunId:string, message:string)=>{
    await prisma.zapRun.update({
        where: { id: zapRunId },
        data: {
            status: ZapRunStatus.ERROR,
            completedAt: new Date(),
            errorMessage: message
        },
    });
}

async function runZap(zapId: string, zapRunId: string, metadata: any): Promise<boolean> {
    // console.log("Metadata: \n", metadata);
    const allActions = await prisma.action.findMany({
        where: { zapId },
        orderBy: { sortingOrder: "asc" },
        include: {
            availableAction: true,
            filter: true
        }
    })
    if(!allActions || allActions.length==0){
        logError(zapRunId, "No actions associated with this Zap Run");
        return true;
    }
    for (const action of allActions) {

        const config: any = action.metadata;
        try {

            const renderedConfig: Record<string, any> = {};
            for (const key in config) {
                renderedConfig[key] = replaceFunction(config[key],  metadata);
            }
            //Check for the conditions
            // [
            //   { "field": "amount", "condition": "GREATER_THAN", "value": "500" },
            //   { "field": "currency", "condition": "EQUALS", "value": "USD" }
            // ]
            if (action.filter?.conditions && Array.isArray(action.filter.conditions)) {
                const allCondiitons: any = action.filter.conditions;
                const filterResult = allConditionsPassed(allCondiitons, metadata);
                if (!filterResult.passed) {
                    logError(zapRunId, filterResult.message || "Filter conditions were not met");
                    console.log("Error: ",filterResult.message);
                    return true; // because it got cancelled
                }
            }
            console.log("filter conditions were passed successfully");
            if (action.availableAction.name === "email") {
                const { to, body } = renderedConfig;
                console.log("to:", to, "body: ", body);
                if (!to || !body) {
                    logError(zapRunId, "Missing 'to' or 'body' in email action config for action ID")
                    throw new Error(`Missing 'to' or 'body' in email action config for action ID ${action.id}`);
                }

                await sendEmail({
                    to,
                    subject: "Zap Notification",
                    body,
                })
                console.log(`✅ Email sent to ${to}`);
            }
        } catch (err) {
            console.error(`Step ${action.id} failed:`, err);
            throw err;
        }
    }
    return false;
}
async function main() {
    await consumer.connect();
    await consumer.subscribe({
        topic: TOPIC_NAME, fromBeginning: false
    });

    await consumer.run({
        eachMessage: async ({ message }) => {
            let payload;
            let zapRunId, zapId, metadata;
            try {
                payload = JSON.parse(message.value!.toString());
                zapRunId = payload.zapRunId;
                zapId = payload.zapId
                metadata = payload.metadata;
            } catch (err: any) {
                console.error("Failed to parse Kafka message.", err);
                logError(zapRunId, err.message);
                return;
            }


            if (!zapRunId || !zapId) {
                console.error("Invalid payload received, missing zapRunId or zapId.");
                logError(zapRunId, "Invalid payload received, missing zapRunId or zapId.");
                return;
            }
            console.log("processing zapid: ", zapId);
            try {
                const isCancelled = await runZap(zapId, zapRunId, metadata);
                if (!isCancelled) {
                    await prisma.zapRun.update({
                        where: { id: zapRunId },
                        data: {
                            status: ZapRunStatus.SUCCESS,
                            completedAt: new Date(),
                        }
                    })
                }
                console.log("Successfully completed ZapRun", zapRunId);

            } catch (err: any) {
                console.error("Failed to process message", err)
                logError(zapRunId, err.message);
            }
        }
    })
}
main();