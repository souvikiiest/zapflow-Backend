import express, { Response } from "express";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth";

export const userRouter = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;
console.log("From signin: ", JWT_SECRET);

userRouter.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  res.status(201).json({ message: "User created successfully", userId: user.id });
});

userRouter.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, userId: user.id });
});

userRouter.post("/auth/me", authMiddleware, async (req:any,res:Response)=>{
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({isLoggedIn: false, message: "User not authenticated." });
  }
  try{
    const userDetails = await prisma.user.findUnique({
      where:{id:userId},
    })
    return res.status(200).json({isLoggedIn: true, userDetails});
  }catch(err:any){
    return res.status(500).json({isLoggedIn: false, message: err.message})
  }
})
