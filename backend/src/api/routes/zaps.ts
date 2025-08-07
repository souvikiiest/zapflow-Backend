import { Prisma, PrismaClient } from "@prisma/client";
import express, { Response } from "express";
import { authMiddleware } from "../middleware/auth";

const prisma = new PrismaClient();
export const zapsRouter = express.Router();
const HOOKS_URL = process.env.HOOKS_URL;

zapsRouter.post("/init", authMiddleware, async (req: any, res: Response) => {
  const userId = req.userId;
  if (!userId) {
      return res.status(401).json({ message: "User not authenticated." });
  }

  const { triggerId, schedule } = req.body;
  if (!triggerId) {
      return res.status(400).json({ message: "A triggerid is required." });
  }

  try {
      const zap = await prisma.$transaction(async (tx:Prisma.TransactionClient) => {
          const newZap = await tx.zap.create({
              data: {
                  userId: userId,
                  active:true,
              }
          });

          await tx.trigger.create({
              data: {
                  zapId: newZap.id,
                  availableTriggerId: triggerId,
                  metadata: {},
                  schedule:schedule || null,
              }
          });

          return newZap;
      });

      res.status(201).json({
          message: "Zap initialized successfully.",
          zapId: zap.id,
          webHookUrl: `${HOOKS_URL}/catch/${userId}/${zap.id}`,
      });

  } catch (err) {
      console.error("Error initializing zap:", err);
      res.status(500).json({ message: "Failed to initialize zap. The transaction was rolled back." });
  }
});


/**
 * @route POST /
 * @desc Creates and publishes a new Zap.
 */
zapsRouter.post("/", authMiddleware, async (req: any, res: Response) => {
    const { zapId, trigger, actions } = req.body;
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ message: "User not authenticated." });
    }
    if (!zapId || !trigger || !actions || !trigger.availableTriggerId || !Array.isArray(actions)) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        await prisma.$transaction(async (tx:Prisma.TransactionClient) => {
            await tx.zap.update({
                where:{id:zapId},
                data: {
                    userId: userId,
                    active:true,
                },
            });

            await tx.trigger.update({
                where:{zapId},
                data: {
                    availableTriggerId: trigger.availableTriggerId, 
                    metadata: trigger.metadata || {},
                    schedule:trigger.schedule || null
                },
            });

            if (actions.length > 0) {
                await Promise.all(actions.map((action: any, index: number) => {
                    if (!action.actionId) {
                        throw new Error("Each action must have an ActionId.");
                    }
                    return tx.action.create({
                        data: {
                            zapId: zapId,
                            availableActionId: action.actionId, 
                            sortingOrder: action.sortingOrder ?? index, 
                            metadata: action.metadata || {},
                            filter: action.filter ? {
                                create:{
                                    conditions: action.filter.conditions || []
                                }
                            }:undefined
                        },
                    });
                }));
            }
        });
        res.status(201).json({ message: "Zap published successfully!" });

    } catch (err: any) {
       
        console.error("Error creating zap:", err);
        res.status(500).json({ message: "Error creating zap. The transaction was rolled back.", error: err.message });
    }
});

/**
 * @route GET /
 * @desc Get all zaps for a user.
 */
zapsRouter.get("/", authMiddleware, async (req: any, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ message: "User not authenticated." });
    }

    try {
        const allZaps = await prisma.zap.findMany({
            where: { userId },
            include: {
                trigger: {
                    include: {
                        availableTrigger: true 
                    }
                },
                actions: {
                    include: {
                        availableAction: true 
                    },
                    orderBy: {
                        sortingOrder: 'asc' 
                    }
                }
            }
        });
        res.status(200).json(allZaps);
    } catch (err) {
        console.error("Error fetching zaps:", err);
        res.status(500).json({ message: "Failed to fetch zaps." });
    }
});

/**
 * @route GET /zaps/:id
 * @desc Gets a single Zap by its ID.
 *  */
zapsRouter.get("/zap/:id", authMiddleware, async (req: any, res: Response) => {
    const userId = req.userId;
    const zapId = req.params.id;
    try {
        const zap = await prisma.zap.findFirst({
            where: {
                id: zapId,
                userId: userId 
            },
            include: {
                trigger: { 
                    include: {
                        availableTrigger: true
                    }
                },
                actions: {
                    include:{filter:true}
                },
            },
        });

        if (!zap) {
            return res.status(404).json({ message: "Zap not found or unauthenticated user." });
        }
        
        res.status(200).json(zap);
    } catch (err) {
        console.log(`Error fetching zap with ID ${zapId}:`, err);
        res.status(500).json({ message: "Failed to fetch zap." });
    }
});

/**
 * @route GET /zaps/:id/metadata
 * @desc Gets the metadata from the most recent run of a specific Zap.
 */
zapsRouter.get("/:id/metadata", authMiddleware, async (req: any, res: Response) => {
    const userId = req.userId;
    const zapId = req.params.id;

    try {
        const zapOwner = await prisma.zap.findFirst({
            where: { id: zapId, userId: userId },
            select: { id: true }
        });

        if (!zapOwner) {
            return res.status(404).json({ message: "Zap not found or you do not have permission to view it." });
        }

        const triggerRun = await prisma.zapRun.findFirst({
            where: { zapId },
            orderBy: { createdAt: "desc" }, 
        });

        if (!triggerRun) {
            return res.status(404).json({ message: "No sample metadata found for this Zap." });
        }

        res.status(200).json({ metadata: triggerRun.metadata });
    } catch (err) {
        console.error(`Error fetching metadata for zap ${zapId}:`, err);
        res.status(500).json({ message: "Failed to fetch metadata." });
    }
});

/**
 * @route PUT /zaps/:id
 * @desc Updates a Zap's trigger and actions.
 */
zapsRouter.put("/:id", authMiddleware, async (req: any, res: Response) => {
    const userId = req.userId;
    const zapId = req.params.id;
    const { trigger, actions, active } = req.body;

    if (!trigger || !trigger.availableTriggerId || !Array.isArray(actions)) {
        return res.status(400).json({ message: "Invalid request body. 'trigger' and 'actions' are required." });
    }

    try {
        await prisma.$transaction(async (tx:Prisma.TransactionClient) => {
            const zap = await tx.zap.findFirst({
                where: { id: zapId, userId: userId },
                select: { id: true, trigger: { select: { id: true } } }
            });

            if (!zap) {
                throw new Error("Zap not found or user does not have permission.");
            }
            await tx.zap.update({
                where: { id: zapId },
                data: { active: active }
            });

            if (zap.trigger?.id) {
                await tx.trigger.update({
                    where: { id: zap.trigger.id },
                    data: {
                        availableTriggerId: trigger.availableTriggerId,
                        metadata: trigger.metadata || {},
                        schedule: trigger.schedule || null,
                    }
                });
            }
            await tx.action.deleteMany({
                where: { zapId: zapId }
            });
            console.log(actions.length);
            
            if (actions.length > 0) {
                await Promise.all(actions.map((action: any, index: number) => {
                    return tx.action.create({
                        data: {
                            zapId: zapId,
                            availableActionId: action.availableActionId,
                            sortingOrder: action.sortingOrder ?? index,
                            metadata: action.metadata || {},
                            filter: action.filter?{
                                create:{
                                    conditions: action.filter.conditions || []
                                }
                            }:undefined
                        },
                    });
                }));
            }
        });

        res.status(200).json({ message: "Zap updated successfully" });

    } catch (err: any) {
        console.error(`Error updating zap ${zapId}:`, err);
        res.status(500).json({ message: "Error updating zap. TXN rolled back" });
    }
});

/**
 * @route DELETE /zaps/:id
* @desc Deletes a Zap and all its related data (triggers, actions, runs).
 */
zapsRouter.delete("/:id", authMiddleware, async (req: any, res: Response) => {
    const userId = req.userId;
    const zapId = req.params.id;

    try {
    
        const result = await prisma.zap.deleteMany({
            where: {
                id: zapId,
                userId: userId, 
            },
        });
        if (result.count === 0) {
            return res.status(404).json({ message: "Zap not found or you do not have permission to delete it." });
        }

        res.status(200).json({ message: "Zap deleted successfully" });

    } catch (err) {
        console.error(`Error deleting zap ${zapId}:`, err);
        res.status(500).json({ message: "Failed to delete zap." });
    }
});

/**
 * @route GET /zaps/history/:id
* @desc Fetch the history of zapRun from zap table.
 */

zapsRouter.get("/history/:id", authMiddleware, async(req:any, res:Response)=>{
    const zapId = req.params.id;
    const userId = req.userId;

    try{
        const zapOwner = await prisma.zap.findFirst({
            where: { id: zapId, userId: userId },
            select: { id: true }
        });

        if (!zapOwner) {
            return res.status(404).json({ message: "You do not have permission to view it." });
        }
        const zapRuns = await prisma.zap.findUnique({
            where:{id:zapId},
            include:{zapRuns:{orderBy:{createdAt:'desc'}}}
        })
        res.status(200).json(zapRuns?.zapRuns);
    }catch(err){

    }
})

zapsRouter.get("/health", (req:any, res:any) => {
    res.status(200).json({
        status: "healthy",
        service: "api-server/zapsrouter",
        timestamp: new Date().toISOString(),
    });
});
