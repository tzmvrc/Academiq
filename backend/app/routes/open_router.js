import express from "express";
import { ChatController } from "../services/test/open_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

router.use(authMiddleware); // All chat routes require authentication

router.get("/global-messages", ChatController.getGlobalMessages);
router.post("/global-messages", ChatController.createGlobalMessage);

router.get("/dm-conversations", ChatController.getConversations);
router.post("/dm-conversations", ChatController.createConversation);

router.get("/dm-messages/:conversationId", ChatController.getDmMessages);
router.post("/dm-messages", ChatController.createDmMessage);
router.post("/reactions", ChatController.addReaction);
router.delete("/reactions", ChatController.removeReaction);

export default router;
