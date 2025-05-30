const { Op } = require("sequelize");
const db = require("../db/user.db");
const { Responder } = require("../utils/responder");

const COA = db.coa;

exports.getCOA = async (req, res) => {
  const { page = 1, limit = 25, cari } = req.query;

  try {
    const offset = (page - 1) * limit;

    const whereClause = {
      status: "AKTIF",
    };

    if (cari) {
      const searchSplit = cari.split(" ");
      whereClause[Op.and] = searchSplit.map((item) => ({
        accountname: {
          [Op.like]: `%${item}%`,
        },
      }));
    }

    const datas = await COA.findAndCountAll({
      where: whereClause,
      order: [["id_coa", "ASC"]],
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
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.deleteCOA = async (req, res) => {
  const { id } = req.params;

  try {
    await COA.destroy({
      where: {
        id_coa: id,
      },
    });

    Responder(res, "OK", null, { message: "COA berhasil dihapus!" }, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.updatecreateCOA = async (req, res) => {
  const { id } = req.params;
  const { accountname, description, status } = req.body;

  try {
    const getCOA = await COA.findOne({
      where: {
        id_coa: id,
      },
    });

    if (getCOA) {
      await COA.update(
        { accountname, description, status },
        {
          where: {
            id_coa: id,
          },
        }
      );
    } else {
      await COA.create({
        id_coa: id,
        accountname: accountname,
        description: description,
        status: status,
      });
    }

    Responder(res, "OK", null, { message: "COA berhasil disimpan" }, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};
