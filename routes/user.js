import express from "express";
const router = express.Router();

import {
  signin,
  signup,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  updateUserAccess,
  followers,
} from "../controllers/user.js";
import { verifyAdmin, verifyUserId } from "../middleware/auth.js";

router.post("/signin", signin);
router.post("/signup", signup);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", verifyUserId, updateUser);
router.patch("/access/:id", verifyAdmin, updateUserAccess);
router.patch("/find/:id", verifyUserId, changePassword);
router.patch("/followers/:creator", followers);

export default router;
