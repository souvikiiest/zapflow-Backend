import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface authReq extends Request{
    userId : string
}

const JWT_SECRET:string = process.env.JWT_SECRET!;
console.log(JWT_SECRET);

export function authMiddleware(req:any, res:Response, next:NextFunction){
    const authHeader  = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")){
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader?.split(" ")[1];
    try{
        const decoded = jwt.verify(token, JWT_SECRET) as unknown as {userId:string};
        req.userId = decoded.userId;
        next();
    }catch(err){
        return res.status(401).json({ error: "Invalid token" });
    }
}