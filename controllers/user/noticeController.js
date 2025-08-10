import asyncHandler from "express-async-handler";
import Notice from "../../models/noticeModel.js";
const getMyNotices = asyncHandler(async (req, res) => {
  const memberId = req.user._id;
  const notices = await Notice.find({
    $or: [
      { recipientType: 'All' },
      { recipients: memberId }
    ]
  })
  .select("-recipients -sentBy") 
  .sort({ createdAt: -1 }); 

  res.json(notices);
});

export { getMyNotices };