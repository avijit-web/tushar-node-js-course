import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import authMiddleware from "../middleware/Authenticate.js";
import ProfileController from "../controllers/ProfileController.js";
import NewsController from "../controllers/NewsController.js";

const router = Router();

router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);

// profile routes

router.get("/auth/profile", authMiddleware, ProfileController.index);
router.put("/auth/profile/:id", authMiddleware, ProfileController.update);

router.get("/news", NewsController.index);
router.post("/news", authMiddleware, NewsController.store);
router.get("/news/:id", NewsController.show);
router.put("/news/:id", NewsController.update);
router.delete("/news/:id", NewsController.delete);

export default router;
