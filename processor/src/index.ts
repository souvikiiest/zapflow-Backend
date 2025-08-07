import { PrismaClient, ZapRunOutboxStatus } from "@prisma/client";
import { producer } from "./kafka-producer";

const client = new PrismaClient();
const TOPIC_NAME = "zap-events";
async function processOutbox() {
    const unsent =await client.zapRunOutbox.findMany({
        where:{
            status:ZapRunOutboxStatus.PENDING,
        },
        include:{
            zapRun:true
        },
        take:10
    });

    if ( unsent.length == 0){
        return
    }

    for(const item of unsent){
        const payload = {
            zapRunId:item.zapRunId,
            zapId : item.zapRun.zapId,
            metadata: item.zapRun.metadata
        }
        try{
            await producer.send({
                topic:TOPIC_NAME,
                messages:[{
                    key:item.zapRunId,
                    value: JSON.stringify(payload)
                }
                ]
            })

            await client.zapRunOutbox.update({
                where:{
                    id:item.id,
                },
                data:{status:ZapRunOutboxStatus.SUCCESS,
                    completedAt:new Date(),
                }
            })
            console.log("sent zaprun with id: ", item.zapRunId, "to kafka queue");
        }
        catch(err:any){
            console.log("Failed to sent zap with id: ", item.zapRunId);

            await client.zapRunOutbox.update({
                where:{
                    id:item.id,
                },
                data:{
                    status:ZapRunOutboxStatus.ERROR,
                    errorMessage: err.message || "Unknown error",
                    completedAt: new Date(),
                }
            })
        }
    }
}


async function main() {
    await producer.connect();
    console.log("Kafka producer connected")
    setInterval(processOutbox, 3000);
}

main().catch(err=>{
    console.error("Processor error", err);
    
});

// ./kafka-topics.sh --bootstrap-server localhost:9092 --create --topic zap-events
// docker exec -it zapier_clone_kafka /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic test-topic
