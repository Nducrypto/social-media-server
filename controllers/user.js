import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import UserSocialMedia from "../models/user.js";
import { SocialMediaNew } from "../models/postMessage.js";
import dotenv from "dotenv";
import { createError } from "../error/error.js";
import { mergeSort } from "../sorting/sorting.js";

dotenv.config();

// SIGNUP
export const signup = async (req, res, next) => {
  const { email, password, firstName, lastName, confirmPassword, profilePics } =
    req.body;

  try {
    const existingUser = await UserSocialMedia.findOne({ email });

    if (existingUser) return next(createError(404, "User alraedy exist."));
    if (password !== confirmPassword)
      return next(createError(404, "Password Don't Match."));

    // let hashedPassword = await bcrypt.hash(req.body.password, 10);

    const result = await UserSocialMedia.create({
      email,
      password,
      firstName,
      lastName,
      profilePics,
    });

    const token = jwt.sign(
      {
        id: result._id,
        isAdmin: result.isAdmin,
        isSuspended: result.isSuspended,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1y",
      }
    );

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

    const token = jwt.sign(
      {
        isAdmin: user.isAdmin,
        id: user._id,
        isSuspended: user.isSuspended,
      },
      process.env.JWT_SECRET,

      { expiresIn: "1y" }
    );

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
    const user = await UserSocialMedia.findById({ _id: req.params.id });

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

    // Find the user and handle user not found
    const user = await UserSocialMedia.findById(id);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    // Update the user object
    user.email = email || user.email;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.profilePics = profilePics || user.profilePics;
    user.bio = bio || user.bio;
    user.isAdmin = isAdmin || user.isAdmin;
    user.isSuspended = isSuspended || user.isSuspended;

    const updateUser = await user.save();

    const token = jwt.sign(
      { isAdmin: user.isAdmin, id: user._id },
      process.env.JWT_SECRET,

      { expiresIn: "1y" }
    );

    // UPDATING PROFILE INFO FOR ALL POST MADE BY THE CREATOR
    const posts = await SocialMediaNew.updateMany(
      { creator: id },
      {
        $set: {
          firstName: req.body.firstName || user.firstName,
          lastName: req.body.lastName || user.lastName,
          profilePics: req.body.profilePics || user.profilePics,
        },
      },
      { new: true }
    );
    res.status(200).json({ result: updateUser, token });
  } catch (err) {
    next(createError(401, "failed to update"));
  }
};

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
    const sortedFollowers = mergeSort(followersIds);

    // Implement binary search
    const binarySearch = () => {
      let left = 0;
      let right = sortedFollowers.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (
          sortedFollowers[mid].toString() === req.body.followerId.toString()
        ) {
          return mid; // Return the index of the target
        } else if (sortedFollowers[mid] < req.body.followerId) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return -1; // Return -1 if the target is not found
    };
    const index = binarySearch();

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

// =====RESET_PASSWORD
