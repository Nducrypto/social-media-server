import express from "express";
import mongoose from "mongoose";
import { createError } from "../Error/error.js";

import SocialMedia from "../models/postMessage.js";

const router = express.Router();

//=====GETPOSTs
export const getPosts = async (req, res, next) => {
  const { page } = req.query;

  try {
    const LIMIT = 5;
    const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

    const total = await SocialMedia.countDocuments({});
    const posts = await SocialMedia.find()
      .sort({ _id: -1 })
      .limit(LIMIT)
      .skip(startIndex);

    res.json({
      data: posts,
      currentPage: Number(page),
      numberOfPages: Math.ceil(total / LIMIT),
    });
  } catch (err) {
    next(createError(400, "Failed to make api get request"));
  }
};

//===== GETPOST
export const getPost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await SocialMedia.findById(id);

    res.status(201).json(post);
  } catch (err) {
    next(createError(400, "Failed to make api getid request"));
  }
};

// ==================== CREATEPOST
export const createPost = async (req, res) => {
  const post = req.body;

  const newPost = new SocialMedia({
    ...post,
    creator: req.userId,
    createdAt: new Date().toISOString(),
  });

  try {
    await newPost.save();

    res.status(201).json(newPost);
  } catch (err) {
    next(createError(400, "Failed to create post"));
  }
};

//===================== DELELE POST
export const deletePost = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(createError(400, `No post with id: ${id}`));

  await SocialMedia.findByIdAndRemove(id);

  res.json({ message: "Post deleted successfully." });
};

//=================== LIKEPOST
export const likePost = async (req, res, next) => {
  const { id } = req.params;

  if (!req.userId) {
    return next(createError(400, "Unauthenticated"));
  }

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(createError(400, `No post with id: ${id}`));

  const post = await SocialMedia.findById(id);

  const index = post.likes.findIndex((id) => id === String(req.userId));

  // dis is if user wants to like a post, its set to -1 cos he hasnt liked
  if (index === -1) {
    post.likes.push(req.userId);
  } else {
    post.likes = post.likes.filter((id) => id !== String(req.userId));
  }

  const updatedPost = await SocialMedia.findByIdAndUpdate(id, post, {
    new: true,
  });

  res.status(200).json(updatedPost);
};

// ===========================UPDATEPOST
export const updatePost = async (req, res, next) => {
  const { id: _id } = req.params;
  const post = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id))
    return next(createError(400, `No post with id: ${id}`));

  const updatedPost = await SocialMedia.findByIdAndUpdate(_id, post, {
    new: true,
  });

  res.json(updatedPost);
};

//== GETPOSTBYSEARCH
export const getPostsBySearch = async (req, res) => {
  const { searchQuery, tags } = req.query;

  try {
    //convertd it to a regularexpresion 4 database 2 undstn nd "i" means ignore case, weda upper or lowercase
    const title = new RegExp(searchQuery, "i");

    const posts = await SocialMedia.find({
      $or: [{ title }, { tags: { $in: tags.split(",") } }],
    });

    res.json({ data: posts });
  } catch (err) {
    next(createError(400, "Failed to get post by search"));
  }
};

//=== GETPOSTBY CREATOR
export const getPostsByCreator = async (req, res) => {
  const { name } = req.query;

  try {
    const posts = await SocialMedia.find({ name });

    res.json({ data: posts });
  } catch (err) {
    next(createError(400, "Failed to get post by creator"));
  }
};

export const commentPost = async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  const post = await SocialMedia.findById(id);

  post.comments.push(value);

  const updatedPost = await SocialMedia.findByIdAndUpdate(id, post, {
    new: true,
  });

  res.json(updatedPost);
};

export default router;
