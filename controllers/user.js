import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import UserSocialMedia from "../models/user.js";
import SocialMediaNew from "../models/postMessage.js";
import dotenv from "dotenv";
import { createError } from "../error/error.js";

dotenv.config();

// SIGNUP
export const signup = async (req, res, next) => {
  const { email, password, firstName, lastName, confirmPassword, profilePics } =
    req.body;

  try {
    const existingUser = await UserSocialMedia.findOne({ email });

    if (existingUser) return next(createError(404, "User alraedy exist."));

    if (password !== confirmPassword)
      return next(createError(404, "Passwords don't match"));

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await UserSocialMedia.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      profilePics,
    });

    const token = jwt.sign(
      { id: result._id, isAdmin: result.isAdmin },
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
    const existingUser = await UserSocialMedia.findOne({ email });

    if (!existingUser) return next(createError(404, "User doesn't exist."));

    const isPasswordCorrect = await bcrypt.compare(
      req.body.password,
      existingUser.password
    );

    if (!isPasswordCorrect)
      return next(createError(404, "Invalid Email or Password."));

    const token = jwt.sign(
      { isAdmin: existingUser.isAdmin, id: existingUser._id },
      process.env.JWT_SECRET,

      { expiresIn: "1y" }
    );
    const { password, ...otherDetails } = existingUser._doc;

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
    const user = await UserSocialMedia.find({ _id: req.params.id });
    res.status(200).json(user);
  } catch (err) {
    next(createError(401, "error making user request"));
  }
};

// =====UPDATE_USER
export const updateUser = async (req, res, next) => {
  try {
    const user = await UserSocialMedia.findById(req.params.id);

    if (user) {
      const { email, bio, profilePics, firstName, lastName } = user;
      user.email = email;
      user.firstName = req.body.firstName || firstName;
      user.lastName = req.body.lastName || lastName;
      user.profilePics = req.body.profilePics || profilePics;
      user.bio = req.body.bio || bio;
    }

    const updateUser = await user.save();

    const token = jwt.sign(
      { isAdmin: user.isAdmin, id: user._id },
      process.env.JWT_SECRET,

      { expiresIn: "1y" }
    );
    const posts = await SocialMediaNew.updateMany(
      { creator: req.params.id },
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

// ===CHANGE_PASSWORD

export const changePassword = async (req, res, next) => {
  const { oldPassword, password } = req.body;

  try {
    const existingUser = await UserSocialMedia.findById(req.params.id);

    if (!existingUser)
      return next(createError(401, "User not found please sign in"));

    const PasswordCorrect = await bcrypt.compare(
      oldPassword,
      existingUser.password
    );
    if (!PasswordCorrect) return next(createError(404, "Password dont match."));

    if (PasswordCorrect && existingUser) {
      existingUser.password = password;
    }
    await existingUser.save();

    res.status(200).json("password changed successfully");
  } catch (err) {
    next(createError(401, "failed to update"));
  }
};

// =====RESET_PASSWORD
