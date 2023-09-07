import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import UserSocialMedia from "../models/user.js";
import { SocialMediaNew } from "../models/postMessage.js";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

import { createError } from "../error/error.js";
import { mergeSort } from "../sorting/sorting.js";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function generateToken(user) {
  return jwt.sign(
    { isAdmin: user.isAdmin, id: user._id, isSuspended: user.isSuspended },
    process.env.JWT_SECRET,
    { expiresIn: "1y" }
  );
}

// SIGNUP
export const signup = async (req, res, next) => {
  const { email, password, firstName, lastName, confirmPassword } = req.body;

  try {
    const existingUser = await UserSocialMedia.findOne({ email });

    if (existingUser) return next(createError(404, "User alraedy exist."));
    if (password !== confirmPassword)
      return next(createError(404, "Password Don't Match."));

    const result = await UserSocialMedia.create({
      email,
      password,
      firstName,
      lastName,
    });
    const token = generateToken(result);
    res.status(200).json({ result, token });
  } catch (error) {
    next(createError(404, "Something went wrong"));
  }
};

// SIGNIN
export const signin = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await UserSocialMedia.findOne({ email });

    if (!user) return next(createError(404, "User doesn't exist."));

    const checkIfPasswordIsCorrect = await bcrypt.compare(
      req.body.password.toString(),
      user.password
    );
    if (!checkIfPasswordIsCorrect)
      return next(createError(404, "Invalid Email or Password."));
    const token = generateToken(user);
    const { password, ...otherDetails } = user._doc;
    res.status(200).json({ result: { ...otherDetails }, token });
  } catch (err) {
    next(createError(404, "Something went wrong"));
  }
};

// ======GET_ALL
export const getUsers = async (req, res, next) => {
  try {
    const allusers = await UserSocialMedia.find();
    res.status(200).json(allusers);
  } catch (error) {
    next(createError(401, "error making Users request"));
  }
};

// ======GET_BY_ID
export const getUserById = async (req, res, next) => {
  try {
    if (!req.params.id) {
      return next(createError(400, "No id Sent"));
    }
    const user = await UserSocialMedia.findById(req.params.id);

    res.status(200).json(user);
  } catch (err) {
    next(createError(401, "error making user request"));
  }
};

// =====UPDATE_USER
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      email,
      bio,
      profilePics,
      firstName,
      lastName,
      isAdmin,
      isSuspended,
    } = req.body;

    const user = await UserSocialMedia.findById(id);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    if (profilePics) {
      const saveImageToCloudinary = await updateProfilePicture(profilePics);
      await deleteInitialProfilePicture(user.profilePics);
      user.profilePics = saveImageToCloudinary;
    }

    await updateUserObject(
      user,
      email,
      firstName,
      lastName,
      bio,
      isAdmin,
      isSuspended
    );
    const updatedUser = await user.save();

    const token = generateToken(updatedUser);

    await updateUserInformationInPosts(
      id,
      user.profilePics,
      firstName,
      lastName
    );

    res.status(200).json({ result: updatedUser, token });
  } catch (err) {
    next(createError(401, "Failed to update"));
  }
};

// Helper function to update profile picture and return URL
async function updateProfilePicture(profilePics) {
  const profilePicsUrl = await cloudinary.uploader.upload(profilePics);
  return profilePicsUrl.url;
}

// Helper function to delete initial profile picture from Cloudinary
async function deleteInitialProfilePicture(initialProfilePics) {
  if (initialProfilePics) {
    const publicId = initialProfilePics.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(publicId); // Return the promise
  }
}

// Helper function to update user object fields
function updateUserObject(
  user,
  email,
  firstName,
  lastName,
  bio,
  isAdmin,
  isSuspended
) {
  Object.assign(user, {
    email: email || user.email,
    firstName: firstName || user.firstName,
    lastName: lastName || user.lastName,
    bio: bio || user.bio,
    isAdmin: isAdmin || user.isAdmin,
    isSuspended: isSuspended || user.isSuspended,
  });
}

async function updateUserInformationInPosts(
  userId,
  newProfilePicsUrl,
  firstName,
  lastName
) {
  await SocialMediaNew.updateMany(
    { creator: userId },
    {
      $set: {
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        profilePics: newProfilePicsUrl,
      },
    },
    { new: true }
  );
}

export const updateUserAccess = async (req, res, next) => {
  try {
    const user = await UserSocialMedia.findById(req.params.id);
    if (!user) {
      next(createError(401, "user not found"));
    }
    // Validate input data and set defaults
    const isSuspended = req.body.isSuspended === "true" || false;
    const isAdmin = req.body.isAdmin === "true" || false;

    // If user is suspended, make sure they are not an admin
    user.isSuspended = isSuspended;
    user.isAdmin = isSuspended ? false : isAdmin;
    // Update other fields if provided
    if (req.body.email) {
      user.email = req.body.email;
    }
    if (req.body.firstName) {
      user.firstName = req.body.firstName;
    }
    if (req.body.lastName) {
      user.lastName = req.body.lastName;
    }
    if (req.body.profilePics) {
      user.profilePics = req.body.profilePics;
    }
    if (req.body.bio) {
      user.bio = req.body.bio;
    }

    const updateUserAccess = await user.save();

    // const token = jwt.sign(
    //   { isAdmin: user.isAdmin, id: user._id },
    //   process.env.JWT_SECRET,

    //   { expiresIn: "1y" }
    // );

    // UPDATING PROFILE INFO FOR ALL POST MADE BY THE CREATOR

    res.status(200).json({ result: updateUserAccess });
  } catch (err) {
    next(createError(401, "failed to update"));
  }
};

// ===CHANGE_PASSWORD

export const changePassword = async (req, res, next) => {
  const { oldPassword, password, confirmPassword } = req.body;

  try {
    const existingUser = await UserSocialMedia.findById(req.params.id);

    if (!existingUser)
      return next(createError(401, "User not found please sign in"));
    if (password !== confirmPassword)
      return next(createError(401, "Password Doesn't Match"));

    const PasswordCorrect = await bcrypt.compare(
      oldPassword,
      existingUser.password
    );

    if (!PasswordCorrect) return next(createError(404, "Password Not Found."));

    if (PasswordCorrect && existingUser) {
      existingUser.password = password;
    }
    await existingUser.save();

    res.status(200).json("password changed successfully");
  } catch (err) {
    next(createError(401, "failed to update"));
  }
};

// ====followers====
export const followers = async (req, res, next) => {
  try {
    const { creator } = req.params;
    let user = await UserSocialMedia.findById(creator);
    if (!user) {
      next(createError(401, "user not found"));
    }
    const followersIds = user.followers.map((id) =>
      mongoose.Types.ObjectId(id)
    );
    //  import mergeSort from sorting.js
    const sortedFollowers = mergeSort(followersIds, (a, b) => {
      return a - b;
    });

    const index = binarySearch(sortedFollowers, req.body.followerId);

    if (index === -1) {
      user.followers.push(req.body.followerId);
    } else {
      user.followers.splice(index, 1);
    }
    const update = await user.save();

    res.status(200).json(update);
  } catch (err) {
    next(createError(401, "failed to Follow"));
  }
};

const binarySearch = (sortedFollowers, followerId) => {
  let left = 0;
  let right = sortedFollowers.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedFollowers[mid].toString() === followerId) {
      return mid; // Return the index of the target
    } else if (sortedFollowers[mid] < followerId) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1; // Return -1 if the target is not found
};
// =====RESET_PASSWORD
