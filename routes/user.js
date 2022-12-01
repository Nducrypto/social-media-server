import express from "express";
const router = express.Router();

import {
  signin,
  signup,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
} from "../controllers/user.js";

router.post("/signin", signin);
router.post("/signup", signup);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.patch("/find/:id", changePassword);

export default router;
