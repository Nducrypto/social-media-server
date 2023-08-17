import { SocialMediaNew } from "../models/postMessage.js";
import UserSocialMedia from "../models/user.js";

// update previous info when you add a new state in your schema
export const dataBaseMigration = async (req, res, next) => {
  try {
    // Fetch all existing posts
    const posts = await SocialMediaNew.find();

    // Iterate through each post and update the admin field
    for (const post of posts) {
      // Fetch user information for the post's creator
      const user = await UserSocialMedia.findOne({ _id: post.creator });

      // Set the admin field based on whether the user is an admin
      post.isAdmin = user?.isAdmin;

      // Save the updated post
      await post.save();
    }

    res.status(200).json({ message: "Data migration completed successfully." });
  } catch (err) {
    next(createError(500, "Data migration failed"));
  }
};
