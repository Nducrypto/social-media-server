import express from "express";
import mongoose from "mongoose";
import { createError } from "../error/error.js";

import { SocialMediaNew } from "../models/postMessage.js";

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

  if (!id) return next(createError(400, `No post with id: ${id}`));

  await SocialMediaNew.findByIdAndRemove(id);

  res.json({ message: "Post deleted successfully." });
};

//=================== LIKEPOST
export const likePost = async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    if (!userId) {
      return next(createError(400, "Unauthenticated"));
    }

    const post = await SocialMediaNew.findById(id);
    const index = post.likes.indexOf(userId);

    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    const updatedPost = await SocialMediaNew.findByIdAndUpdate(id, post, {
      new: true,
    });

    res.status(200).json(updatedPost);
  } catch (err) {
    next(createError(400, "Failed to get post by creator"));
  }
};

// ===========================UPDATEPOST
export const updatePost = async (req, res, next) => {
  const { id: _id } = req.params;
  const post = req.body;

  if (!post) return next(createError(400, `No post found`));

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

// commentPost function using mongoDb method
export const comment = async (req, res) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    comment,
    parentCommentId,
    parentReplyId,
    // currentDepth = 0,
  } = req.body;
  try {
    if (!req.body) {
      next(createError(400, "Please make a cooment"));
    }
    const post = await SocialMediaNew.findById(id);

    if (parentCommentId) {
      const parentComment = post.comments.id(parentCommentId);

      if (!parentComment) {
        next(createError(400, "Parent comment not found"));
      }

      if (parentReplyId) {
        const parentReply = parentComment.replies.id(parentReplyId);

        if (!parentReply) {
          next(createError(400, "Parent reply not found"));
        }

        // Add the sub-reply to the parent reply's subReplies array
        parentReply.subReply.push({
          text: comment,
          author: `${firstName} ${lastName}`,
        });
        await post.save();
      } else {
        // If no parentReplyId, add the reply to the parent comment
        parentComment.replies.push({
          text: comment,
          author: `${firstName} ${lastName}`,
          subReply: [], // Initialize the subReply array
        });
        await post.save();
      }
    } else {
      const newComment = {
        text: comment,
        author: `${firstName} ${lastName}`,
        parentComment: parentCommentId || null,
      };

      post.comments.push(newComment);
      await post.save();
    }

    // Save the changes to the post after adding the sub-reply

    const updatedPost = await SocialMediaNew.findById(id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Second commentPost function using recursion which is findComment function
export const commentPost = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, comment, parentCommentId, parentReplyId } =
    req.body;

  try {
    if (!req.body) {
      next(createError(400, "Please make a cooment"));
    }
    const post = await SocialMediaNew.findById(id);
    if (!post) {
      next(createError(400, "Post not found"));
    }
    if (parentCommentId) {
      // Handle nested Comments or Replies within comments
      const { parentComment, reply } = findComment(
        post.comments,
        parentCommentId,
        parentReplyId
      );

      if (parentReplyId) {
        // Handle replying to a sub-reply within a comment
        if (!reply) {
          next(createError(400, "Parent reply not found"));
        }
        // If there is a reply add req.body to the Subreplies array

        reply.subReply.push({
          text: comment,
          author: `${firstName} ${lastName}`,
        });
        await post.save();
      } else {
        if (!parentComment) {
          next(createError(400, "Parent reply not found"));
        }
        // If no reply add the reply to the parent comment
        parentComment.replies.push({
          text: comment,
          author: `${firstName} ${lastName}`,
        });
        await post.save();
      }
    } else {
      // If no parentCommentId or parentReplyId, add the comment to the post's comments array
      post.comments.push({ text: comment, author: `${firstName} ${lastName}` });
      await post.save();
    }
    const updatedPost = await SocialMediaNew.findById(id);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Helper Recursive function to find comment or Replies by its ID
const findComment = (comments, parentCommentId, parentReplyId) => {
  let reply = null;
  let parentComment = null;
  for (const comment of comments) {
    if (comment._id.toString() === parentCommentId) {
      if (!parentReplyId) {
        return { parentComment: comment, reply: null }; // Return the comment if commentId matches and parentReplyId is not provided
      } else {
        const findReplyToComment = findComment(comment.replies, parentReplyId); // Recursively search for the nested comment

        return {
          parentComment: null,
          reply: findReplyToComment.parentComment,
        };
      }
    }
  }
  return { parentComment, reply }; // CommentId not found, return null
};

export default router;
