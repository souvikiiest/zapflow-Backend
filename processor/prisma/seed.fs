
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  console.log("Deleting existing available actions and triggers...");
  await prisma.availableAction.deleteMany({});
  await prisma.availableTrigger.deleteMany({});
  console.log("Deletion complete.");


  console.log("Seeding new available actions and triggers...");
  
  const availableWebhook = await prisma.availableAction.create({
    data: {
      name: "webhook",
      image: "webhook.png",
    },
  });

  const availableScheduler = await prisma.availableTrigger.create({
    data: {
      name: "schedule", 
      image: "scheduler.png",
    },
  });

  const availableEmail = await prisma.availableAction.create({
    data: {
      name: "email", 
      image: "email.png",
    },
  });

  const availableFilter = await prisma.availableAction.create({
    data: {
      name: "filter", 
      image: "filter.png", 
    },
  });

  console.log("🌱 Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });