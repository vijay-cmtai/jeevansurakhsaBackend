import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
  {
    // User/Member se link karne ke liye. Visitor ke case mein yeh null rahega.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Aapke User model ka naam yahan daalein
    },
    // Payment ka type kya hai
    paymentType: {
      type: String,
      required: true,
      enum: [
        "MEMBERSHIP_FEE", // Membership Payment Receipt page ke liye
        "MEMBER_DONATION", // Active Users Donation Receipts page ke liye
        "VISITOR_DONATION", // All Visitor Donation page ke liye
        "CASH_DONATION", // Cash Donation Receipts page ke liye
      ],
    },
    amount: {
      type: Number,
      required: true,
    },
    receiptNo: {
      type: String,
      required: true,
      unique: true,
    },
    paymentMode: {
      type: String,
      required: true,
      enum: ["Online", "Cash"],
    },
    transactionId: {
      type: String, // Online payment ke liye
      unique: true,
      sparse: true, // Allows multiple null values but unique if it exists
    },
    // Visitor ya Cash donation ke case mein, jab user registered nahi hai
    nonMemberDetails: {
      name: { type: String },
      email: { type: String },
      mobile: { type: String },
    },
    // Cash donation ke liye payment ka proof
    paymentImage: {
      type: String, // Image ka URL/path
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    // Cash donation kisne add kiya (Admin/Manager)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Yeh function receipt number generate karne mein help karega
paymentSchema.pre("save", async function (next) {
  if (!this.isNew) {
    next();
  }
  // Yahan aap receipt number generation ka logic likh sakte hain
  // Example: MRCP-101, VDRCF-19, CDRCP-20 etc.
  // Abhi ke liye ek simple logic daal raha hoon
  const lastPayment = await this.constructor.findOne(
    {},
    {},
    { sort: { createdAt: -1 } }
  );
  let prefix = "";
  switch (this.paymentType) {
    case "MEMBERSHIP_FEE":
      prefix = "MRCP-";
      break;
    case "MEMBER_DONATION":
      prefix = "MDRCP-";
      break;
    case "VISITOR_DONATION":
      prefix = "VDRCP-";
      break;
    case "CASH_DONATION":
      prefix = "CDRCP-";
      break;
  }
  const lastId = lastPayment
    ? parseInt(lastPayment.receiptNo.split("-")[1])
    : 0;
  this.receiptNo = prefix + (lastId + 1);
  next();
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
