import mongoose from "mongoose";

// const replySchema = mongoose.Schema(
//   {
//     text: { type: String },
//     author: { type: String },
//   },
//   { timestamps: true }
// );

// const commentSchema = mongoose.Schema(
//   {
//     text: { type: String },
//     author: { type: String },
//     parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
//     replies: [replySchema],
//   },
//   { timestamps: true }
// );

const postSchema = mongoose.Schema(
  {
    message: { type: String, min: 3, max: 150 },
    firstName: String,
    lastName: String,
    creator: String,
    selectedFile: String,
    profilePics: String,
    likes: { type: [String], default: [] },
    comments: [
      {
        text: { type: String },
        author: { type: String },
        parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
        replies: [
          {
            text: { type: String },
            author: { type: String },
            subReply: [],
          },
          { timestamps: true },
        ],
      },
      { timestamps: true },
    ],
    // comments: [commentSchema],
  },
  { timestamps: true }
);

// const Comment = mongoose.model("Comment", commentSchema);

// const ReplyComment = mongoose.model("ReplyComment", replySchema);

const SocialMediaNew = mongoose.model("SocialMediaNew", postSchema);

export { SocialMediaNew };
// export { SocialMediaNew, Comment, ReplyComment };
