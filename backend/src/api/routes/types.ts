import { PrismaClient } from "@prisma/client";
import express from "express";

const prisma = new PrismaClient();
export const typesRouter = express.Router();

typesRouter.get("/available-triggers", async (req, res) => {
  const triggers = await prisma.availableTrigger.findMany();
  res.json(triggers);
});

typesRouter.get("/available-actions", async (req, res) => {
  const actions = await prisma.availableAction.findMany();
  res.json(actions);
});
