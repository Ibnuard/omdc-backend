const { Op, Sequelize } = require("sequelize");
const { encPassword } = require("../utils/encPass");
const { decodeToken, getToken } = require("../utils/jwt");
const { Responder } = require("../utils/responder");
const db_user = require("../db/user.db");

// db
const SuperUser = db_user.superuser;
const Reimbursement = db_user.reimbursement;
const User = db_user.ruser;
const MUser = db_user.muser;

// Create and Save
exports.createUser = async (req, res) => {
  const { iduser, departemen, type } = req.body;

  if (!iduser || !departemen || !type) {
    return Responder(res, "ERROR", "Data tidak lengkap!", null);
  }

  // GET USER DATA FROM M_USER
  const getUser = await MUser.findOne({
    where: {
      iduser: iduser,
    },
  });

  const userData = await getUser["dataValues"];

  SuperUser.create({
    iduser: userData?.iduser,
    nm_user: userData?.nm_user,
    level_user: userData?.level_user,
    departemen: departemen,
    password: userData?.password,
    type: type,
  })
    .then((data) => {
      Responder(res, "OK", null, data, 200);
      return;
    })
    .catch((err) => {
      Responder(res, "ERROR", null, null, 400);
      return;
    });
};

exports.getUser = async (req, res) => {
  const { authorization } = req.headers;
  const { page = 1, limit = 25, get, exceptId, rid } = req.query;
  try {
    const userData = decodeToken(getToken(authorization));

    const offset = (page - 1) * limit;

    const whereClause = {};

    if (!get) {
      whereClause.type = "ADMIN";

      // Menambahkan kondisi untuk exceptId jika diberikan
      if (exceptId) {
        whereClause.iduser = { [Op.not]: [userData?.iduser, exceptId] };
      } else {
        if (rid) {
          console.log("HAS RID");
          const r_data = await Reimbursement.findOne({
            where: {
              id: rid,
            },
          });

          const getR_Data = await r_data;
          let acceptanceList = getR_Data["accepted_by"].map(
            (item) => item.iduser
          );
          acceptanceList.push(userData.iduser);

          console.log("AC LIST", acceptanceList);

          whereClause.iduser = { [Op.notIn]: acceptanceList };
        } else {
          // Jika tidak ada exceptId, maka exclude hanya userData?.iduser
          whereClause.iduser = { [Op.ne]: userData?.iduser };
        }
      }
    }

    const users = await SuperUser.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
    });

    // result count
    const resultCount = users?.count;

    const totalPage = resultCount / limit;
    const totalPageFormatted =
      Math.round(totalPage) == 0 ? 1 : Math.ceil(totalPage);

    Responder(
      res,
      "OK",
      null,
      {
        rows: users?.rows,
        pageInfo: {
          pageNumber: parseInt(page),
          pageLimit: parseInt(limit),
          pageCount: totalPageFormatted,
          pageSize: resultCount,
        },
      },
      200
    );
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.get_pengajuan = async (req, res) => {
  const { authorization } = req.headers;
  const {
    page = 1,
    limit = 10,
    monthyear,
    status,
    cari,
    type,
    sort,
    web,
    statusCA,
    statusROP,
    periodeStart,
    periodeEnd,
    statusType,
    kategori,
    cabang,
  } = req.query;

  try {
    const userData = decodeToken(getToken(authorization));

    let order;
    const whereClause = {};

    // Menambahkan pengurutan berdasarkan tipePembayaran
    const orderClause = [
      ["tipePembayaran", "DESC"], // Mengurutkan dari Urgent ke Regular
      ["accepted_date", "DESC"], // Finally, sort by createdAt
      ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
    ];

    const sortClause = [
      [
        Sequelize.literal(`CASE
      WHEN JSON_UNQUOTE(JSON_EXTRACT(accepted_by, '$[*].status')) LIKE '%"WAITING"%'
      THEN 1
      ELSE 2
    END`),
        "ASC",
      ],
    ];

    // if (sort) {
    //   order = [
    //     ["tipePembayaran", "DESC"], // Then sort by tipePembayaran
    //     ["accepted_date", "DESC"], // Finally, sort by createdAt
    //     ["createdAt", "DESC"], // Finally, sort by createdAt
    //   ];
    // } else {
    //   order = orderClause;
    // }

    if (web) {
      // whereClause[Op.or] = [
      //   Sequelize.fn(
      //     "JSON_CONTAINS",
      //     Sequelize.col("accepted_by"),
      //     `[{"iduser": "${userData?.iduser}"}]`
      //   ),
      //   {
      //     [Op.and]: [
      //       { needExtraAcceptance: true },
      //       { "extraAcceptance.iduser": userData.iduser },
      //     ],
      //   },
      // ];

      if (statusType == "waiting") {
        whereClause[Op.or] = [
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              { status: "WAITING" },
              { status_finance: { [Op.ne]: "DONE" } }, // Tambahkan kondisi status_finance !== "DONE"
              ...(kategori ? [{ tipePembayaran: kategori }] : []),
            ],
          },
          {
            [Op.and]: [
              { needExtraAcceptance: true },
              { "extraAcceptance.iduser": userData.iduser },
              { status_finance: { [Op.ne]: "DONE" } }, // Tambahkan kondisi status_finance !== "DONE"
              ...(kategori ? [{ tipePembayaran: kategori }] : []),
            ],
          },
        ];

        order = [
          ["tipePembayaran", "DESC"],
          ["createdAt", "ASC"],
        ];
      } else if (statusType == "done") {
        whereClause[Op.or] = [
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              {
                status: {
                  [Op.ne]: ["WAITING"],
                },
              },
              ...(kategori ? [{ tipePembayaran: kategori }] : []),
            ],
          },
          {
            [Op.and]: [
              {
                needExtraAcceptance: true,
                extraAcceptanceStatus: {
                  [Op.ne]: ["IDLE"],
                },
              },
              { "extraAcceptance.iduser": userData.iduser },
              //{ status_finance: { [Op.ne]: "DONE" } }, // Tambahkan kondisi status_finance !== "DONE"
              ...(kategori ? [{ tipePembayaran: kategori }] : []),
            ],
          },
        ];
        order = [["createdAt", "DESC"]];
      } else {
        whereClause[Op.or] = [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("accepted_by"),
            `[{"iduser": "${userData?.iduser}"}]`
          ),
          ...(kategori ? [{ tipePembayaran: kategori }] : []),
        ];
      }

      // status CA
      if (statusCA) {
        if (statusCA == "DONE") {
          whereClause[Op.and] = [
            Sequelize.fn(
              "JSON_CONTAINS",
              Sequelize.col("accepted_by"),
              `[{"iduser": "${userData?.iduser}"}]`
            ),
            { status_finance: "DONE" },
            { jenis_reimbursement: "Cash Advance" },
            { status_finance_child: "DONE" },
          ];
        } else {
          whereClause[Op.and] = [
            Sequelize.fn(
              "JSON_CONTAINS",
              Sequelize.col("accepted_by"),
              `[{"iduser": "${userData?.iduser}"}]`
            ),
            { status_finance: "DONE" },
            { jenis_reimbursement: "Cash Advance" },
            { status_finance_child: { [Op.ne]: "DONE" } },
          ];
        }
      }
    } else {
      order = orderClause;
    }

    // status ROP
    if (statusROP) {
      if (statusROP == "WAITING") {
        whereClause[Op.and] = [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("accepted_by"),
            `[{"iduser": "${userData?.iduser}"}]`
          ),
          { status: "WAITING" },
          { status_finance: { [Op.notIn]: ["DONE", "REJECTED"] } },
        ];
      } else if (statusROP == "APPROVED") {
        whereClause[Op.and] = [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("accepted_by"),
            `[{"iduser": "${userData?.iduser}"}]`
          ),
          { status: "APPROVED" },
          { status_finance: { [Op.notIn]: ["DONE", "REJECTED"] } },
        ];
      } else if (statusROP == "REJECTED") {
        whereClause[Op.and] = [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("accepted_by"),
            `[{"iduser": "${userData?.iduser}"}]`
          ),
          { status: "REJECTED" },
        ];
      } else if (statusROP == "DONE") {
        whereClause[Op.and] = [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("accepted_by"),
            `[{"iduser": "${userData?.iduser}"}]`
          ),
          { status: "APPROVED" },
          { status_finance: "DONE" },
        ];
      }
    }

    // Tipe Pembayaran
    if (type) {
      if (type == "CASH") {
        whereClause.payment_type = "CASH";
      } else if (type == "TRANSFER") {
        whereClause.payment_type = "TRANSFER";
      }
    }

    if (cabang) {
      const cabangValues = cabang.split(",");

      whereClause.kode_cabang = {
        [Op.or]: cabangValues.map((value) => ({
          [Op.like]: `${value} -%`,
        })),
      };
    }

    if (periodeStart && periodeEnd) {
      whereClause.accepted_date = {
        [Op.between]: [periodeStart, periodeEnd],
      };
    }

    // Menambahkan filter berdasarkan status jika diberikan
    if (status) {
      if (status === "01") {
        whereClause[Op.or] = [
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              {
                status: { [Op.ne]: "WAITING" },
              },
              { jenis_reimbursement: { [Op.ne]: "Cash Advance" } },
            ],
          },
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              {
                [Op.or]: [
                  Sequelize.fn(
                    "JSON_CONTAINS",
                    Sequelize.col("accepted_by"),
                    `[{"iduser": "${userData?.iduser}", "status": "APPROVED"}]`
                  ),
                  Sequelize.fn(
                    "JSON_CONTAINS",
                    Sequelize.col("accepted_by"),
                    `[{"iduser": "${userData?.iduser}", "status": "REJECTED"}]`
                  ),
                ],
              },
              { jenis_reimbursement: { [Op.ne]: "Cash Advance" } },
            ],
          },
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              {
                status: { [Op.ne]: "WAITING" },
              },
              { jenis_reimbursement: "Cash Advance" },
              { status_finance: "DONE" },
              { status_finance_child: "DONE" },
            ],
          },
          {
            needExtraAcceptance: true,
            extraAcceptanceStatus: { [Op.ne]: "WAITING" },
            extraAcceptance: {
              iduser: userData.iduser,
              status: { [Op.ne]: "WAITING" },
            },
            jenis_reimbursement: { [Op.ne]: "Cash Advance" },
          },
        ];

        order = orderClause;
      } else if (status === "00") {
        // NORMAL ACC
        whereClause[Op.or] = [
          // Kondisi NORMAL ACC
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}", "status": "WAITING"}]`
              ),
              { status: "WAITING" },
            ],
          },
          // Kondisi EXTRA ACC
          {
            needExtraAcceptance: true,
            extraAcceptanceStatus: "WAITING",
            extraAcceptance: {
              iduser: userData.iduser,
              status: "WAITING",
            },
          },
          {
            [Op.and]: [
              Sequelize.fn(
                "JSON_CONTAINS",
                Sequelize.col("accepted_by"),
                `[{"iduser": "${userData?.iduser}"}]`
              ),
              { status_finance: "DONE" },
              { jenis_reimbursement: "Cash Advance" },
              { status_finance_child: "IDLE" },
            ],
          },
        ];

        order = [
          sortClause,
          ["tipePembayaran", "DESC"], // Mengurutkan dari Urgent ke Regular
          ["accepted_date", "DESC"], // Finally, sort by createdAt
          ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
        ];
      }
    }

    if (monthyear) {
      const my = monthyear.split("-");
      const month = my[0];
      const year = my[1];

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      whereClause.createdAt = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (cari && cari.length > 0) {
      const searchSplit = cari.split(" ");
      const searchConditions = searchSplit.map((item) => ({
        [Op.or]: [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("item"),
            `[{"invoice": "${item}"}]`
          ),
          {
            jenis_reimbursement: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            kode_cabang: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            coa: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            requester_name: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            tipePembayaran: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            no_doc: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            name: {
              [Op.like]: `%${item}%`,
            },
          },
        ],
      }));

      whereClause[Op.and] = searchConditions;
    }

    // Cek apakah sudah direview oleh reviewer
    //whereClause.reviewStatus = "APPROVED";

    // Menghitung offset berdasarkan halaman dan batasan
    const offset = (page - 1) * limit;

    const requested = await Reimbursement.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit), // Mengubah batasan menjadi tipe numerik
      offset: offset, // Menetapkan offset untuk penampilan halaman
      order: order,
    });

    // result count
    const resultCount = requested?.count;
    const totalPageFormatted = Math.ceil(resultCount / limit);

    Responder(
      res,
      "OK",
      null,
      {
        rows: requested?.rows,
        pageInfo: {
          pageNumber: parseInt(page),
          pageLimit: parseInt(limit),
          pageCount: totalPageFormatted,
          pageSize: resultCount,
        },
      },
      200
    );
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 500);
    return;
  }
};

exports.get_pengajuan_finance = async (req, res) => {
  const { authorization } = req.headers;
  const {
    page = 1,
    limit = 10,
    monthyear,
    status,
    cari,
    type,
    sort,
    statusCA,
    statusROP,
    periodeStart,
    periodeEnd,
    statusType,
    kategori,
    cabang,
  } = req.query;

  try {
    const userData = decodeToken(getToken(authorization));

    const whereClause = {};
    let order;

    const financeStatusSortClause = Sequelize.literal(`CASE
      WHEN status_finance = 'WAITING' THEN 1
      WHEN status_finance = 'IDLE' THEN 1
      ELSE 2
    END`);

    // Menambahkan pengurutan berdasarkan tipePembayaran
    const orderClause = [
      ["tipePembayaran", "DESC"], // Mengurutkan dari Urgent ke Regular
      ["accepted_date", "DESC"], // Finally, sort by createdAt
      ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
    ];

    // Tipe Pembayaran
    if (type) {
      if (type == "CASH") {
        whereClause.payment_type = "CASH";
      } else if (type == "TRANSFER") {
        whereClause.payment_type = "TRANSFER";
      }
    }

    if (periodeStart && periodeEnd) {
      whereClause.accepted_date = {
        [Op.between]: [periodeStart, periodeEnd],
      };
    }

    if (cabang) {
      const cabangValues = cabang.split(",");

      whereClause.kode_cabang = {
        [Op.or]: cabangValues.map((value) => ({
          [Op.like]: `${value} -%`,
        })),
      };
    }

    const getStatusFinanceChildCondition = (statusCA) =>
      statusCA === "DONE" ? "DONE" : { [Op.ne]: "DONE" };

    const getWhereClauseForCA = (statusCA) => [
      { status_finance: "DONE" },
      { jenis_reimbursement: "Cash Advance" },
      { status_finance_child: getStatusFinanceChildCondition(statusCA) },
      ...(kategori ? [{ tipePembayaran: kategori }] : []),
    ];

    if (statusType) {
      if (statusType === "waiting") {
        whereClause[Op.and] = [
          { makerStatus: "APPROVED" },
          { status_finance: "WAITING" },
          ...(kategori ? [{ tipePembayaran: kategori }] : []),
        ];
        order = [
          ["tipePembayaran", "DESC"], // Mengurutkan dari Urgent ke Regular
          ["createdAt", "ASC"], // Mengurutkan berdasarkan createdAt secara descending
        ];
      } else if (statusCA) {
        whereClause[Op.and] = getWhereClauseForCA(statusCA);
        order = [
          ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
        ];
      } else {
        whereClause[Op.and] = [
          { makerStatus: "APPROVED" },
          { status_finance: { [Op.ne]: "WAITING" } },
          ...(kategori ? [{ tipePembayaran: kategori }] : []),
        ];
        order = [
          ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
        ];
      }
    } else if (statusCA) {
      whereClause[Op.and] = getWhereClauseForCA(statusCA);
      order = [
        ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
      ];
    }

    // status rop
    if (statusROP) {
      if (statusROP == "WAITING") {
        whereClause[Op.and] = [
          { status_finance: { [Op.notIn]: ["DONE", "REJECTED"] } },
        ];
      } else if (statusROP == "APPROVED") {
        whereClause[Op.and] = [
          { status: "APPROVED" },
          { status_finance: { [Op.notIn]: ["DONE", "REJECTED"] } },
        ];
      } else if (statusROP == "REJECTED") {
        whereClause.status = "REJECTED";
      } else if (statusROP == "DONE") {
        whereClause[Op.and] = [
          { status: "APPROVED" },
          { status_finance: "DONE" },
        ];
      }
    }

    if (monthyear) {
      const my = monthyear.split("-");
      const month = my[0];
      const year = my[1];

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      whereClause.createdAt = {
        [Op.between]: [startDate, endDate],
      };
    }

    // Menambahkan filter berdasarkan status jika diberikan
    if (status) {
      order = orderClause;
    }

    if (status === "00") {
      //whereClause.status_finance = { [Op.ne]: "DONE" }; // Memilih status selain 'APPROVED'
      whereClause[Op.and] = [
        {
          [Op.and]: [{ status: "APPROVED" }, { reviewStatus: "APPROVED" }],
        },
        {
          [Op.or]: [
            {
              status_finance: "WAITING",
            },
            {
              [Op.and]: [
                { status_finance: "DONE" },
                { jenis_reimbursement: "Cash Advance" },
                { status_finance_child: "IDLE" },
              ],
            },
            // Tambahkan kondisi lain jika diperlukan di sini
          ],
        },
      ];

      order = [
        financeStatusSortClause,
        ["tipePembayaran", "DESC"], // Mengurutkan dari Urgent ke Regular
        ["accepted_date", "DESC"], // Finally, sort by createdAt
        ["createdAt", "DESC"], // Mengurutkan berdasarkan createdAt secara descending
      ];
    } else if (status === "01") {
      whereClause[Op.or] = [
        {
          [Op.and]: [
            { status_finance: "DONE" },
            { status_finance_child: "DONE" },
          ],
        },
        {
          [Op.and]: [{ status: "REJECTED" }, { status_finance: "REJECTED" }],
        },
      ];
      // whereClause.status_finance = "DONE";
      // whereClause.status_finance_child = "DONE";

      order = orderClause;
    }

    whereClause.makerStatus = "APPROVED";

    if (cari && cari.length > 0) {
      const searchSplit = cari.split(" ");
      const searchConditions = searchSplit.map((item) => ({
        [Op.or]: [
          Sequelize.fn(
            "JSON_CONTAINS",
            Sequelize.col("item"),
            `[{"invoice": "${item}"}]`
          ),
          {
            jenis_reimbursement: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            kode_cabang: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            coa: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            requester_name: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            tipePembayaran: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            no_doc: {
              [Op.like]: `%${item}%`,
            },
          },
          {
            name: {
              [Op.like]: `%${item}%`,
            },
          },
        ],
      }));

      whereClause[Op.and] = searchConditions;
    }

    //     let order;

    //     if (sort) {
    //       order = [
    //         financeStatusSortClause, // First, sort by status
    //         ["tipePembayaran", "DESC"], // Then sort by tipePembayaran
    //         ["accepted_date", "ASC"], // Finally, sort by createdAt
    //         ["createdAt", "DESC"], // Finally, sort by createdAt
    //       ];
    //     } else {
    //       order = orderClause;
    //     }

    // Menghitung offset berdasarkan halaman dan batasan
    const offset = (page - 1) * limit;

    const requested = await Reimbursement.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit), // Mengubah batasan menjadi tipe numerik
      offset: offset, // Menetapkan offset untuk penampilan halaman
      order: order,
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
        rows: requested?.rows,
        pageInfo: {
          pageNumber: parseInt(page),
          pageLimit: parseInt(limit),
          pageCount: totalPageFormatted,
          pageSize: resultCount,
        },
      },
      200
    );
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 500);
    return;
  }
};

exports.getUserDetail = async (req, res) => {
  const { id } = req.query;

  try {
    const user = await User.findOne({ where: { iduser: id } });
    const userData = await user["dataValues"];

    delete userData.userToken;

    Responder(res, "OK", null, userData, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.deleteAdmin = async (req, res) => {
  const { iduser } = req.params;

  console.log(`DELETING ${iduser}`);

  try {
    await SuperUser.destroy({
      where: {
        iduser: iduser,
      },
    });

    await User.update(
      {
        isAdmin: 0,
        type: "USER",
      },
      {
        where: {
          iduser: iduser,
        },
      }
    );

    Responder(res, "OK", null, { message: "Admin berhasil dihapus!" }, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 25, cari } = req.query;

  try {
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (cari) {
      const searchSplit = cari.split(" ");
      whereClause[Op.and] = searchSplit.map((item) => ({
        nm_user: {
          [Op.like]: `%${item}%`,
        },
      }));
    }

    const datas = await MUser.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
    });

    // result count
    const resultCount = datas?.count;

    const totalPage = resultCount / limit;
    const totalPageFormatted =
      Math.round(totalPage) == 0 ? 1 : Math.ceil(totalPage);

    Responder(
      res,
      "OK",
      null,
      {
        rows: datas.rows,
        pageInfo: {
          pageNumber: parseInt(page),
          pageLimit: parseInt(limit),
          pageCount: totalPageFormatted,
          pageSize: resultCount,
        },
      },
      200
    );
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};
