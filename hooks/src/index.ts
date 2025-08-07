import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import { flattenObj } from "./utils/hookUtils";

const client = new PrismaClient();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

app.post("/catch/:userId/:zapId", async (req: any, res: any) => {
  const { userId, zapId } = req.params;
  let webHookData = {};
  const contentType = req.get('Content-type');

  if (contentType === 'application/json') {
    webHookData = req.body;
    console.log("application/json type hit");
  } else {
    return res.status(400).send('Unsupported Content-Type only application/json is supported');
  }
  const processedData = flattenObj(webHookData);
  console.log(processedData);

  try {
    const zap = await client.zap.findFirst({
      where: {
        id: zapId,
        userId: userId,
      },
    });

    if (!zap) {
      return res.status(404).json({ error: "Zap not found or invalid user" });

    }

    await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const run = await tx.zapRun.create({
        data: {
          zapId,
          metadata: processedData,
        },
      });

      await tx.zapRunOutbox.create({
        data: {
          zapRunId: run.id,
        },
      });
    });

    return res.json({ status: "ok", message: "Webhook received and stored successfully" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

app.get("/health", (req: any, res: any) => {
  res.status(200).json({
    status: "healthy",
    service: "api-server",
    timestamp: new Date().toISOString(),
  });
});

app.listen(3000, () => {
  console.log("Hook service running on port 3000");
});
