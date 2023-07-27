import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String },
    profilePics: { type: String },
    bio: { type: String, min: 3, max: 40 },
    followers: { type: [String], default: [] },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  let hashedPassword = await bcrypt.hash(this.password, 10);
  this.password = hashedPassword;
  next();
});

export default mongoose.model("UserSocialMedia", userSchema);
