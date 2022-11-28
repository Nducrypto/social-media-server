import express from "express";

import {
  getPosts,
  getPostsBySearch,
  getPostsByCreator,
  getPost,
  createPost,
  updatePost,
  likePost,
  commentPost,
  deletePost,
} from "../controllers/posts.js";

const router = express.Router();
import { verifyUser } from "../middleware/auth.js";

router.get("/creator", getPostsByCreator);
router.get("/search", getPostsBySearch);
router.get("/", getPosts);
router.get("/:id", getPost);

router.post("/", verifyUser, createPost);
router.patch("/:id", verifyUser, updatePost);
router.delete("/:id", verifyUser, deletePost);
router.patch("/likePost/:id", verifyUser, likePost);
router.post("/:id/commentPost", commentPost);

export default router;
