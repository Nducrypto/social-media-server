import express from "express";
import mongoose from "mongoose";
import { createError } from "../error/error.js";

import SocialMediaNew from "../models/postMessage.js";

const router = express.Router();

//=====GETPOSTs
export const getPosts = async (req, res, next) => {
  const { page } = req.query;
  try {
    const LIMIT = 5;
    const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

    const total = await SocialMediaNew.countDocuments({});
    const posts = await SocialMediaNew.find()
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
export const getPost = async (req, res, next) => {
  const { id } = req.params;

  try {
    const post = await SocialMediaNew.findById(id);

    res.status(201).json(post);
  } catch (err) {
    next(createError(400, "Failed to make api getid request"));
  }
};

// ==================== CREATEPOST
export const createPost = async (req, res) => {
  const post = req.body;
  const newPost = new SocialMediaNew(post);

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

  await SocialMediaNew.findByIdAndRemove(id);

  res.json({ message: "Post deleted successfully." });
};

//=================== LIKEPOST
export const likePost = async (req, res, next) => {
  const { id } = req.params;

  if (!req.body.userId) {
    return next(createError(400, "Unauthenticated"));
  }

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(createError(400, `No post with id: ${id}`));

  const post = await SocialMediaNew.findById(id);

  const index = post.likes.findIndex((id) => id === String(req.body.userId));

  // dis is if user wants to like a post, its set to -1 cos he hasnt liked
  if (index === -1) {
    post.likes.push(req.body.userId);
  } else {
    post.likes = post.likes.filter((id) => id !== String(req.body.userId));
  }

  const updatedPost = await SocialMediaNew.findByIdAndUpdate(id, post, {
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

  const updatedPost = await SocialMediaNew.findByIdAndUpdate(_id, post, {
    new: true,
  });

  res.json(updatedPost);
};

//== GETPOSTBYSEARCH
export const getPostsBySearch = async (req, res, next) => {
  const { searchQuery } = req.query;

  try {
    const search = new RegExp(searchQuery, "i");
    const posts = await SocialMediaNew.find({
      $or: [{ firstName: search }, { message: search }, { lastName: search }],
    });

    res.json(posts);
  } catch (err) {
    next(createError(400, "Failed to get post by search"));
  }
};

//=== GETPOSTBY CREATOR
export const getPostsByCreator = async (req, res, next) => {
  const { creator } = req.query;

  try {
    const posts = await SocialMediaNew.find({ creator }).sort({ _id: -1 });

    res.json(posts);
  } catch (err) {
    next(createError(400, "Failed to get post by creator"));
  }
};

export const commentPost = async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  const post = await SocialMediaNew.findById(id);

  post.comments.push(value);

  const updatedPost = await SocialMediaNew.findByIdAndUpdate(id, post, {
    new: true,
  });

  res.json(updatedPost);
};

export default router;
