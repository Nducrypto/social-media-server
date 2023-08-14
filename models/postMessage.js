import mongoose from "mongoose";

const commentSchema = mongoose.Schema(
  {
    text: { type: String },
    userName: { type: String },
    comments: [],
  },
  { timestamps: true }
);

const postSchema = mongoose.Schema(
  {
    message: { type: String, min: 2 },
    firstName: String,
    lastName: String,
    creator: String,
    selectedFile: String,
    profilePics: String,
    likes: { type: [String], default: [] },
    comments: [commentSchema],
  },
  { timestamps: true }
);
const Comment = mongoose.model("Comment", commentSchema);
const SocialMediaNew = mongoose.model("SocialMediaNew", postSchema);

export { SocialMediaNew, Comment };
