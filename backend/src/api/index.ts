
import cors from "cors";
import dotenv from 'dotenv';
import express from "express";
import { typesRouter } from "./routes/types";
import { userRouter } from "./routes/users";
import { zapsRouter } from "./routes/zaps";
dotenv.config();

const app = express();
app.use(cors({
    origin: ['https://zapflow.souvikg.xyz','https://zapflow-one.vercel.app'], // allow only your frontend
    credentials: true // if you're using cookies or Authorization headers
  }));
app.use(express.json())

app.use("/api/v1/zaps", zapsRouter);
app.use("/api/v1/", typesRouter);
app.use("/api/v1/", userRouter);


app.listen(4000, ()=>{
    console.log("Server running on port 4000")
})