import { createError } from "../error/error.js";
import dotenv from "dotenv";

import { SocialMediaNew, Comment } from "../models/postMessage.js";
import UserSocialMedia from "../models/user.js";

import { v2 as cloudinary } from "cloudinary";
import { io } from "../index.js";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allPosts = {};
// catch function using hash map
function catchedAllPosts(posts) {
  for (const post of posts) {
    allPosts[post._id] = { ...post };
    extractCachedPost(allPosts, post._id);
  }

  return allPosts;
}
function extractCachedPost(allPost, postId) {
  const cached = allPost[postId];
  if (cached) {
    return cached._doc;
  }
  return null;
}

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
    catchedAllPosts(posts);
  } catch (err) {
    next(createError(400, "Failed to make api get request"));
  }
};

// ==================== CREATEPOST
export const CreatePost = async (req, res, next) => {
  // Extract data from the request body
  const { message, selectedFile, creator } = req.body;

  try {
    let postPhotoUrl = "";

    // If a file is selected, upload it to Cloudinary
    if (selectedFile) {
      const postPhotoResult = await cloudinary.uploader.upload(selectedFile);
      postPhotoUrl = postPhotoResult.url;
    }

    // Fetch user data from the database based on the creator ID
    const fetchUser = await UserSocialMedia.findById(creator);

    // Create a new post object
    const newPost = new SocialMediaNew({
      message,
      selectedFile: postPhotoUrl,
      profilePics: fetchUser.profilePics,
      firstName: fetchUser.firstName,
      lastName: fetchUser.lastName,
      creator,
      isAdmin: fetchUser.isAdmin,
    });

    // Save the new post to the database
    await newPost.save();

    // Emit an event to inform clients of a new post
    io.emit("new-posts", newPost);

    // Create cache for the new post
    allPosts[newPost._id] = { ...newPost };

    // Send a success response if required
    // res.status(201).json(newPost);
  } catch (err) {
    next(createError(400, "Failed to create post"));
  }
};

//===================== DELELE POST
export const DeletePost = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id) {
      next(createError(400, `No post with id: ${id}`));
    }

    // Check if the post exists in the cache
    const findCachedPost = extractCachedPost(allPosts, id);

    if (findCachedPost) {
      // Emit an event to inform clients of the deleted post
      io.emit("delete-posts", id);
    }

    // Remove the post from the database
    const removePost = await SocialMediaNew.findByIdAndRemove(id);

    // Check if the post had an associated image
    if (removePost.selectedFile) {
      const deleteImageFromCloudinary = removePost.selectedFile
        .split("/")
        .pop()
        .split(".")[0];

      // Delete the image from Cloudinary
      await cloudinary.uploader.destroy(deleteImageFromCloudinary);
    }

    res.json({ message: "Post deleted successfully." });
  } catch (error) {
    next(createError(400, "Failed to delete post"));
  }
};

//  =========LIKEPOST===
export const LikePost = async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    if (!userId) {
      return next(createError(400, "Unauthenticated"));
    }

    const post = await SocialMediaNew.findById(id);

    const update = post.likes.includes(userId)
      ? { $pull: { likes: userId } }
      : { $push: { likes: userId } };

    const updatedPost = await SocialMediaNew.findByIdAndUpdate(id, update, {
      new: true,
    });

    io.emit("like-post", updatedPost);

    // res.status(200).json(updatedPost);
  } catch (err) {
    next(createError(400, "Failed to update post likes"));
  }
};

//=================== LIKEPOST
// export const LikePost = async (req, res, next) => {
//   const { id } = req.params;
//   const { userId } = req.body;

//   try {
//     if (!userId) {
//       return next(createError(400, "Unauthenticated"));
//     }

//     const post = await SocialMediaNew.findById(id);
//     const index = post.likes.indexOf(userId);

//     if (index === -1) {
//       post.likes.push(userId);
//     } else {
//       post.likes.splice(index, 1);
//     }

//     const updatedPost = await SocialMediaNew.findByIdAndUpdate(id, post, {
//       new: true,
//     });

//     res.status(200).json(updatedPost);
//   } catch (err) {
//     next(createError(400, "Failed to get post by creator"));
//   }
// };

// ===========================UPDATEPOST
export const UpdatePost = async (req, res, next) => {
  const { id: _id } = req.params;
  const { selectedFile, ...postUpdates } = req.body;

  try {
    // Find the existing post by ID
    const existingPost = await SocialMediaNew.findById(_id);

    if (!existingPost) {
      return next(createError(404, `Post not found`));
    }

    // check is post exists in cached posts
    const findCached = extractCachedPost(allPosts, _id);
    if (findCached) {
      // If cached, update the post and send the updated post as JSON response
      const updatedPost = Object.assign(findCached, postUpdates);
      res.json(updatedPost);
    }
    // Check if a new file is provided and update the selectedFile if necessary
    if (selectedFile !== existingPost.selectedFile) {
      const postPhotoUrl = await cloudinary.uploader.upload(selectedFile);
      const publicId = existingPost.selectedFile.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
      existingPost.selectedFile = postPhotoUrl.url;
    }

    // Update the existing post with the provided updates
    Object.assign(existingPost, postUpdates);
    // Save the updated post in database
    await SocialMediaNew.findByIdAndUpdate(_id, existingPost, {
      new: true,
    });

    // res.json(updatedPost);
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
// export const comment = async (req, res) => {
//   const { id } = req.params;
//   const {
//     firstName,
//     lastName,
//     comment,
//     parentCommentId,
//     parentReplyId,
//     // currentDepth = 0,
//   } = req.body;
//   try {
//     if (!req.body) {
//       next(createError(400, "Please make a cooment"));
//     }
//     const post = await SocialMediaNew.findById(id);

//     if (parentCommentId) {
//       const parentComment = post.comments.id(parentCommentId);

//       if (!parentComment) {
//         next(createError(400, "Parent comment not found"));
//       }

//       if (parentReplyId) {
//         const parentReply = parentComment.replies.id(parentReplyId);

//         if (!parentReply) {
//           next(createError(400, "Parent reply not found"));
//         }

//         // Add the sub-reply to the parent reply's subReplies array
//         parentReply.subReply.push({
//           text: comment,
//           author: `${firstName} ${lastName}`,
//         });
//         await post.save();
//       } else {
//         // If no parentReplyId, add the reply to the parent comment
//         parentComment.replies.push({
//           text: comment,
//           author: `${firstName} ${lastName}`,
//           subReply: [], // Initialize the subReply array
//         });
//         await post.save();
//       }
//     } else {
//       const newComment = {
//         text: comment,
//         author: `${firstName} ${lastName}`,
//         parentComment: parentCommentId || null,
//       };

//       post.comments.push(newComment);
//       await post.save();
//     }

// Save the changes to the post after adding the sub-reply

//     const updatedPost = await SocialMediaNew.findById(id);
//     res.json(updatedPost);
//   } catch (error) {
//     res.status(500).json({ message: "Something went wrong" });
//   }
// };

export const CommentPost = async (req, res, next) => {
  const { id } = req.params;
  const { firstName, isAdmin, userId, lastName, comment, parentCommentId } =
    req.body;

  try {
    if (!req.body) {
      throw createError(400, "Please make a comment");
    }
    // Find the post by its ID
    const post = await SocialMediaNew.findById(id);
    if (!post) {
      next(createError(400, "Post not found"));
    }
    // Create a new comment object
    const newComment = new Comment({
      text: comment,
      userName: `${firstName} ${lastName}`,
      userId,
      isAdmin,
      comments: [],
    });
    // If it's a reply to a parent comment
    if (parentCommentId) {
      // Try to update the comment recursively
      const commentUpdated = updateCommentRecursively(
        post.comments,
        parentCommentId,
        newComment
      );
      // If the parent comment or reply is not found, return an error
      if (!commentUpdated) {
        next(createError(400, "Parent comment or reply not found"));
      }
      // Save the updated post
      await post.save();
    } else {
      // If it's a top-level comment, simply push it to the post's comments
      post.comments.push(newComment);
      await post.save();
    }
    // Update the post and retrieve the updated version
    const updatePostAfterComment = await SocialMediaNew.findByIdAndUpdate(
      id,
      post,
      {
        new: true,
      }
    );

    // Emit an event to inform clients of a new comment
    io.emit("new-comment", updatePostAfterComment);

    // res.json(updatePostAfterComment);
  } catch (error) {
    next(createError(400, "Failed to comment"));
  }
};

const updateCommentRecursively = (comments, commentId, newComment) => {
  for (const comment of comments) {
    if (comment._id.toString() === commentId) {
      // Add the new comment to the matching comment's replies
      comment.comments.push(newComment);

      return true; // Exit the recursion when the match is found
    } else {
      // Recursively search for the parent comment
      const updated = updateCommentRecursively(
        comment.comments,
        commentId,
        newComment
      );
      if (updated) {
        return true; // Exit the recursion when the match is found
      }
    }
  }
  // If no matching comment is found, return false
  return false;
};

export const DeleteComment = async (req, res, next) => {
  const { id } = req.params;
  const { commentId } = req.body;

  try {
    if (!req.body) {
      next(createError(400, "Please make a comment"));
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

    // Emit an event to inform clients of a removed comment
    io.emit("remove-comment", updatePostAfterDelete);
    // res.json(updatePostAfterDelete);
  } catch (error) {
    next(createError(400, "Failed to Delete"));
  }
};

const removeComment = (comments, commentId) => {
  for (let i = 0; i < comments.length; i++) {
    if (comments[i]._id.toString() === commentId) {
      comments.splice(i, 1); // Remove the comment from the array
      i--; // Decrement the index to account for the removed comment
      return comments; // Exit the function and return the modified array
    } else {
      comments[i].comments = removeComment(comments[i].comments, commentId); // Recurse
    }
  }

  return comments;
};

// const removeComment = (comments, commentId) => {
//   const newComments = comments.filter((comment) => {
//     if (comment._id.toString() === commentId) {
//       return false; // Filter out the comment to delete
//     } else {
//       comment.comments = removeComment(comment.comments, commentId); // Recurse
//       return true; // Keep the comments that shouldn'nt be deleted in the array
//     }
//   });

//   return newComments;
// };
