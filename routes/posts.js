import express from "express";

import {
  GetPosts,
  GetPostsBySearch,
  CreatePost,
  UpdatePost,
  LikePost,
  CommentPost,
  DeletePost,
  DeleteComment,
} from "../controllers/posts.js";

const router = express.Router();
import { verifyUser } from "../middleware/auth.js";

router.get("/search", GetPostsBySearch);
router.get("/", GetPosts);
router.post("/", verifyUser, CreatePost);
router.patch("/:id", verifyUser, UpdatePost);
router.delete("/:id", verifyUser, DeletePost);
router.patch("/likePost/:id", verifyUser, LikePost);
router.post("/:id/commentPost", verifyUser, CommentPost);
router.post("/deleteComment/:id", DeleteComment);

export default router;
