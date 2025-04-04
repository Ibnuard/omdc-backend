const db = require("../../db/user.db");
const { uploadImagesCloudinary } = require("../../utils/cloudinary");
const { sendSingleMessage } = require("../../utils/firebase");
const { Responder } = require("../../utils/responder");
const { getUserDatabyToken, checkUserAuth } = require("../../utils/utils");
const WORKPLAN_COMMENT_DB = db.workplan_comment;
const WORKPLAN_DB = db.workplan;
const USER_SESSION_DB = db.ruser;

exports.create_comment = async (req, res) => {
  const { id } = req.params;
  const { message, comment_id, attachment } = req.body;
  const { authorization } = req.headers;
  try {
    const userData = getUserDatabyToken(authorization);
    const userAuth = checkUserAuth(userData);

    if (userAuth.error) {
      return Responder(res, "ERROR", userAuth.message, null, 401);
    }

    let UPLOAD_IMAGE;

    if (attachment) {
      UPLOAD_IMAGE = await uploadImagesCloudinary(attachment);
    }

    const comment = await WORKPLAN_COMMENT_DB.create({
      replies_to: comment_id,
      message: message,
      create_by: userData.nm_user,
      iduser: userData.iduser,
      attachment: UPLOAD_IMAGE?.secure_url ?? "",
      wp_id: id,
    });

    // send notif
    const getWP = await WORKPLAN_DB.findOne({ where: { id: id } });
    const getWPData = await getWP["dataValues"];
    const workplanCreatorId = getWPData.iduser;

    // get user fcm
    let fcmTokens;

    const usersWithToken = await USER_SESSION_DB.findAll({
      attributes: ["fcmToken"],
      where: { iduser: workplanCreatorId }, // Ambil semua user yang ada dalam CC
      raw: true,
    });

    // 5. Ambil hanya token yang valid
    fcmTokens = usersWithToken.map((user) => user.fcmToken).filter(Boolean);

    console.log("FCM", fcmTokens);

    // 6. Kirim Notifikasi jika ada FCM Token
    if (fcmTokens.length > 0) {
      sendSingleMessage(
        fcmTokens[0],
        {
          title: `Ada komentar baru pada workplan anda!`,
          body: `${userData.nm_user} baru saja menambahkan komentar pada workplan anda.`,
        },
        {
          name: "WorkplanStack",
          screen: "WorkplanDetail",
          params: JSON.stringify({
            id: id.toString(),
          }),
        }
      );
    }

    Responder(res, "OK", null, { success: true, data: comment }, 200);
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 500);
    return;
  }
};

// -- Get Workplan
exports.get_workplan_comment = async (req, res) => {
  const { page = 1, limit = 500 } = req.query;
  const { authorization } = req.headers;
  const { id } = req.params;
  try {
    const userData = getUserDatabyToken(authorization);
    const userAuth = checkUserAuth(userData);

    if (userAuth.error) {
      return Responder(res, "ERROR", userAuth.message, null, 401);
    }

    // Menghitung offset berdasarkan halaman dan batasan
    const offset = (page - 1) * limit;

    const requested = await WORKPLAN_COMMENT_DB.findAndCountAll({
      limit: parseInt(limit),
      offset: offset,
      order: [],
      where: { replies_to: null, wp_id: id },
      include: [
        {
          model: WORKPLAN_COMMENT_DB,
          as: "replies",
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    // result count
    const resultCount = requested?.count;

    const totalPage = resultCount / limit;
    const totalPageFormatted =
      Math.round(totalPage) == 0 ? 1 : Math.ceil(totalPage);

    Responder(
      res,
      "OK",
      null,
      {
        rows: requested.rows,
        pageInfo: {
          pageNumber: parseInt(page),
          pageLimit: parseInt(limit),
          pageCount: totalPageFormatted,
          pageSize: resultCount,
        },
      },
      200
    );
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.count_comment = async (req, res) => {
  const { id } = req.params;
  try {
    const commentCount = await WORKPLAN_COMMENT_DB.count({
      where: {
        wp_id: id,
      },
    });

    Responder(res, "OK", null, { success: true, count: commentCount }, 200);
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};
