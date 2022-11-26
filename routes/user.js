import express from "express";
const router = express.Router();

import {
  signin,
  signup,
  getUsers,
  getUserById,
  updateUser,
} from "../controllers/user.js";

router.post("/signin", signin);
router.post("/signup", signup);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);

export default router;
