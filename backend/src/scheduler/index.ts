import { initializeSchedule } from "./scheduler";

console.log("starting scheduler")
initializeSchedule().then(()=>{
    console.log("Scheduler initialised successfully")
}).catch((err)=>{
    console.error("Error starting scheduler", err);
})