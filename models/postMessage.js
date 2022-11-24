import mongoose from "mongoose";

const postSchema = mongoose.Schema(
  {
    message: { type: String, min: 3, max: 150 },
    firstName: String,
    lastName: String,
    creator: String,
    selectedFile: String,
    profilePics: String,
    likes: { type: [String], default: [] },
    comments: { type: [String], default: [] },
  },
  { timestamps: true }
);

var SocialMediaNew = mongoose.model("SocialMediaNew", postSchema);

export default SocialMediaNew;
