
import cors from "cors";
import dotenv from 'dotenv';
import express from "express";
import { typesRouter } from "./routes/types";
import { userRouter } from "./routes/users";
import { zapsRouter } from "./routes/zaps";
dotenv.config();

let totalRequest = 0;
const serverStartTime = Date.now();

const app = express();
app.use(express.json())

app.use(cors({
    origin: ['https://zapflow.souvikg.xyz','https://zapflow-one.vercel.app'], 
    credentials: true ,
    allowedHeaders: ['Content-Type', 'Authorization']
  }));


app.use((req:any, res:any, next: any)=>{
  totalRequest++;
  next();
})

app.use("/api/v1/health", (req:any,res:any)=>{
  const upTime = (Date.now() - serverStartTime)/1000;
  const rps = upTime > 0 ? totalRequest/upTime : 0;

  return res.status(200).json({
    status: "healthy",
    Uptime: `${upTime/3600} hours `,
    Request_per_second:rps
  })
})


app.use("/api/v1/zaps", zapsRouter);
app.use("/api/v1/", typesRouter);
app.use("/api/v1/", userRouter);


app.listen(4000, ()=>{
    console.log("Server running on port 4000")
})