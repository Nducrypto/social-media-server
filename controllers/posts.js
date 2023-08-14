import { createError } from "../error/error.js";
import dotenv from "dotenv";

import { SocialMediaNew, Comment } from "../models/postMessage.js";
import UserSocialMedia from "../models/user.js";

import { v2 as cloudinary } from "cloudinary";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//=====GETPOSTs
export const GetPosts = async (req, res, next) => {
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
export const CreatePost = async (req, res, next) => {
  const { message, selectedFile, firstName, lastName, creator } = req.body;

  try {
    const user = await UserSocialMedia.findById(creator);
    const postPhotoUrl = selectedFile
      ? await cloudinary.uploader.upload(selectedFile)
      : null;

    const newPost = await SocialMediaNew.create({
      message,
      selectedFile: postPhotoUrl.url ?? null,
      profilePics: user.profilePics ?? null,
      firstName,
      lastName,
      creator,
    });

    res.status(201).json(newPost);
  } catch (err) {
    next(createError(400, "Failed to create post"));
  }
};

//===================== DELELE POST
export const DeletePost = async (req, res, next) => {
  const { id } = req.params;

  if (!id) return next(createError(400, `No post with id: ${id}`));

  const removePost = await SocialMediaNew.findByIdAndRemove(id);

  if (removePost.selectedFile) {
    const deleteImageFromCloudinary = removePost.selectedFile
      .split("/")
      .pop()
      .split(".")[0];
    await cloudinary.uploader.destroy(deleteImageFromCloudinary);
  }

  res.json({ message: "Post deleted successfully." });
};

//=================== LIKEPOST
export const LikePost = async (req, res, next) => {
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
export const UpdatePost = async (req, res, next) => {
  const { id: _id } = req.params;
  const { selectedFile, ...postUpdates } = req.body;
  console.log(postUpdates);
  try {
    const existingPost = await SocialMediaNew.findById(_id);

    if (!existingPost) {
      return next(createError(404, `Post not found`));
    }

    if (selectedFile !== existingPost.selectedFile) {
      const postPhotoUrl = await cloudinary.uploader.upload(selectedFile);
      const publicId = existingPost.selectedFile.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
      existingPost.selectedFile = postPhotoUrl.url;
    }

    Object.assign(existingPost, postUpdates);
    const updatedPost = await SocialMediaNew.findByIdAndUpdate(
      _id,
      existingPost,
      {
        new: true,
      }
    );

    res.json(updatedPost);
  } catch (err) {
    next(createError(400, "Failed to update post"));
  }
};

//== GETPOSTBYSEARCH
export const GetPostsBySearch = async (req, res, next) => {
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

export const CommentPost = async (req, res, next) => {
  const { id } = req.params;
  const { firstName, lastName, comment, parentCommentId } = req.body;

  try {
    if (!req.body) {
      throw createError(400, "Please make a comment");
    }

    const post = await SocialMediaNew.findById(id);
    if (!post) {
      next(createError(400, "Post not found"));
    }

    const newComment = new Comment({
      text: comment,
      userName: `${firstName} ${lastName}`,
      comments: [],
    });

    if (parentCommentId) {
      const commentUpdated = await updateCommentRecursively(
        post.comments,
        parentCommentId,
        newComment
      );

      if (!commentUpdated) {
        next(createError(400, "Parent comment or reply not found"));
      }
      await post.save();
    } else {
      post.comments.push(newComment);
      await post.save();
    }
    const updatePostAfterDelete = await SocialMediaNew.findByIdAndUpdate(
      id,
      post,
      {
        new: true,
      }
    );

    res.json(updatePostAfterDelete);
  } catch (error) {
    next(createError(400, "Failed to comment"));
  }
};

const updateCommentRecursively = (comments, commentId, newComment) => {
  for (const comment of comments) {
    if (comment._id.toString() === commentId) {
      comment.comments.push(newComment);

      return true;
    } else {
      const updated = updateCommentRecursively(
        comment.comments,
        commentId,
        newComment
      );
      if (updated) {
        return true;
      }
    }
  }
  return false;
};

export const DeleteComment = async (req, res, next) => {
  const { id } = req.params;
  const { commentId } = req.body;

  try {
    if (!req.body) {
      throw createError(400, "Please make a comment");
    }

    const post = await SocialMediaNew.findById(id);
    if (!post) {
      next(createError(400, "Post not found"));
    }

    const commentToDelete = await removeComment(post.comments, commentId);

    if (!commentToDelete) {
      next(createError(400, "comment not found"));
    }
    post.comments = commentToDelete;

    const updatePostAfterDelete = await SocialMediaNew.findByIdAndUpdate(
      id,
      post,
      {
        new: true,
      }
    );

    res.json(updatePostAfterDelete);
  } catch (error) {
    next(createError(400, "Failed to Delete"));
  }
};

const removeComment = (comments, commentId) => {
  const newComments = comments.filter((comment) => {
    if (comment._id.toString() === commentId) {
      return false; // Filter out the comment to delete
    } else {
      comment.comments = removeComment(comment.comments, commentId); // Recurse
      return true; // Keep the comment in the array
    }
  });

  return newComments;
};
