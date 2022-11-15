import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.js";
import dotenv from "dotenv";
import { createError } from "../error/error.js";

dotenv.config();

// SIGNUP
export const signup = async (req, res) => {
  const { email, password, firstName, lastName, confirmPassword } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) return next(createError(404, "User alraedy exist."));

    if (password !== confirmPassword)
      return next(createError(404, "Passwords don't match"));

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await User.create({
      email,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
    });

    const token = jwt.sign(
      { email: result, id: result._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "90000h",
      }
    );

    res.status(200).json({ result, token });
  } catch (error) {
    next(createError(404, "Something went wrong"));
  }
};

// SIGNIN
export const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (!existingUser) return next(createError(404, "User doesn't exist."));

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordCorrect)
      return next(createError(404, "Invalid Email or Password."));

    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      process.env.JWT_SECRET,

      { expiresIn: "90000h" }
    );

    res.status(200).json({ result: existingUser, token });
  } catch (err) {
    next(createError(404, "Something went wrong"));
  }
};
