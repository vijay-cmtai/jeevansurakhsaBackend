import mongoose from "mongoose";

const noticeSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // REMOVED: ref: "User" because the User model does not exist.
      // The admin's static ObjectId will still be stored correctly.
    },
    recipientType: {
      type: String,
      required: true,
      enum: ["Single", "All"],
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member", // This is correct because your "Member" model exists.
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Notice = mongoose.model("Notice", noticeSchema);

export default Notice;
