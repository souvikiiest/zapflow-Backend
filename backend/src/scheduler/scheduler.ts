import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

const triggerZap = async(zapId:string)=>{
    // first create a zapRun 
    try{
    const zapRun = await prisma.zapRun.create({
        data:{
            zapId:zapId,
            metadata:{time: new Date()}
        }
    });
    // then an outbox run
    await prisma.zapRunOutbox.create({
        data:{
            zapRunId:zapRun.id
        }
    });
}catch(err:any){
    console.error(`Zap with id ${zapId} failed with error: ${err.message}`);
}

}


export const initializeSchedule = async()=>{
    const allActiveZap = await prisma.zap.findMany({
        where:{
            active:true,
            trigger:{
                schedule:{
                    not:null
                }
            }
        },
        include:{trigger:true}
    })
    console.log("Scheduler found ", allActiveZap.length ,"zaps to schedule");
    for(const zap of allActiveZap){
        if(zap.trigger && zap.trigger.schedule){
            if(cron.validate(zap.trigger.schedule)){
                console.log("Scheduler scheduling job with id:", zap.id, " on schedule", zap.trigger.schedule);

                cron.schedule(zap.trigger.schedule, ()=>triggerZap(zap.id));
            }else{
                console.warn("Invalids schedule present");
            }
        }
    }
}