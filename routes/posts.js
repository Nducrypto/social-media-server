import express from "express";

import {
  getPosts,
  getPostsBySearch,
  createPost,
  updatePost,
  likePost,
  commentPost,
  deletePost,
} from "../controllers/posts.js";

const router = express.Router();
import { verifyUser } from "../middleware/auth.js";

router.get("/search", getPostsBySearch);
router.get("/", getPosts);
router.post("/", verifyUser, createPost);
router.patch("/:id", verifyUser, updatePost);
router.delete("/:id", verifyUser, deletePost);
router.patch("/likePost/:id", verifyUser, likePost);
router.post("/:id/commentPost", commentPost);

export default router;
