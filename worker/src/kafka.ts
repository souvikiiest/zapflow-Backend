
import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId:"zap-processor",
    brokers:["kafka:9092"]
})

export const consumer = kafka.consumer({groupId:"zap-worker-group"})