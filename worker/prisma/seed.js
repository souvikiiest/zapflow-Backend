"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Deleting existing available actions and triggers...");
        yield prisma.availableAction.deleteMany({});
        yield prisma.availableTrigger.deleteMany({});
        console.log("Deletion complete.");
        console.log("Seeding new available actions and triggers...");
        const availableWebhook = yield prisma.availableTrigger.create({
            data: {
                name: "webhook",
                image: "webhook.png",
            },
        });
        const availableScheduler = yield prisma.availableTrigger.create({
            data: {
                name: "schedule",
                image: "scheduler.png",
            },
        });
        const availableEmail = yield prisma.availableAction.create({
            data: {
                name: "email",
                image: "email.png",
            },
        });
        const availableFilter = yield prisma.availableAction.create({
            data: {
                name: "filter",
                image: "filter.png",
            },
        });
        console.log("🌱 Seed complete!");
    });
}
main()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));
