const { Op } = require("sequelize");
const user_db = require("../db/user.db");
const { Responder } = require("../utils/responder");
const { decodeToken, getToken } = require("../utils/jwt");
const { generateRandomNumber } = require("../utils/utils");

const moment = require("moment");
require("moment/locale/id");
moment.locale("id");

const AnakCabang = user_db.anak_cabang;
const Barang = user_db.barang;
const IndukCabang = user_db.cabang;
const TrxPermintaanBarang = user_db.trx_permintaan_barang;
const PermintaanBarang = user_db.permintaan_barang;

exports.getAllAnakCabang = async (req, res) => {
  const { kd_induk } = req.query;
  try {
    const whereClause = {};

    if (kd_induk) {
      whereClause.kd_induk = kd_induk;
    }

    const data = await AnakCabang.findAll({
      where: whereClause,
    });

    Responder(res, "OK", null, data, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.getCabangDetail = async (req, res) => {
  const { kode } = req.query;

  try {
    const getCabang = await AnakCabang.findOne({ where: { kd_cabang: kode } });
    const cabangData = await getCabang["dataValues"];

    Responder(res, "OK", null, cabangData, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.getBarang = async (req, res) => {
  const { cari, page = 1, limit = 25 } = req.query;

  try {
    const whereClause = {
      sts_brg: "AKTIF",
    };

    // Menghitung offset berdasarkan halaman dan batasan
    const offset = (page - 1) * limit;

    if (cari) {
      const searchSplit = cari.split(" ");
      whereClause[Op.and] = searchSplit.map((item) => ({
        nm_barang: {
          [Op.like]: `%${item}%`,
        },
      }));
    }

    const barangCount = await Barang.count();

    const data = await Barang.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit), // Mengubah batasan menjadi tipe numerik
      offset: offset, // Menetapkan offset untuk penampilan halaman
    });

    // result count
    const resultCount = data?.count;

    const totalPage = resultCount / limit;
    const totalPageFormatted =
      Math.round(totalPage) == 0 ? 1 : Math.ceil(totalPage);

    Responder(
      res,
      "OK",
      null,
      {
        data: data?.rows,
        endPage: Math.round(barangCount / limit),
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

exports.createTrxPermintaan = async (req, res) => {
  // barang
  /**
   * kd_brg
   * barcode_brg
   * nm_barang
   * grup_brg
   * kategory_brg
   * nm_kemasan
   * nm_satuan
   * qty_satuan
   * jml_satuan
   * nm_satuan1
   * jml_kemasan -> input
   * nm_kemasan1
   * qty_stock -> input
   * nm_kemasanstock
   * keterangan
   *
   */

  // cabang
  /**
   * kd_induk
   * nm_induk
   * kd_comp
   * nm_comp
   * kd_cabang
   * nm_cabang
   *
   */

  // request
  /**
   * tgl_trans (yyyy-mm-dd)
   * jam (hh:mm:ss)
   * iduser
   * nm_user
   */
  const { kodeIndukCabang, kodeAnakCabang, barang } = req.body;
  const { authorization } = req.headers;

  try {
    // ===== Get Induk Cabang Data
    const getIndukCabang = await IndukCabang.findOne({
      where: {
        kd_induk: kodeIndukCabang,
      },
    });

    const indukCabang = await getIndukCabang["dataValues"];

    // ====== Get Anak Cabang
    const getAnakCabang = await AnakCabang.findOne({
      where: {
        kd_cabang: kodeAnakCabang,
      },
    });

    const anakCabang = await getAnakCabang["dataValues"];

    // ====== User
    const userData = decodeToken(getToken(authorization));

    // Request Data

    const REQUEST_DATE = moment().format("YYYY-MM-DD").split(" ")[0];
    const REQUEST_TIME = moment().format("HH:mm:ss");

    const PB_YY = moment().format("YY");
    const PB_MM = moment().format("MM");
    const PB_DD = moment().format("DD");

    const ID_PB = `PB-${
      indukCabang.kd_induk
    }${PB_YY}${PB_MM}${PB_DD}${generateRandomNumber(1000, 9999)}`;

    // Create Permintaan
    await PermintaanBarang.create({
      id_pb: ID_PB,
      id_pr: "",
      kd_induk: indukCabang.kd_induk,
      nm_induk: indukCabang.nm_induk,
      kd_comp: indukCabang.kd_comp,
      nm_comp: indukCabang.nm_comp,
      kd_cabang: anakCabang.kd_cabang,
      nm_cabang: anakCabang.nm_cabang,
      alamat: anakCabang.alamat_cabang,
      keterangan: "",
      tgl_trans: REQUEST_DATE,
      jam_trans: REQUEST_TIME,
      iduser: userData.iduser,
      nm_user: userData.nm_user,
      status_approve: "",
      id_approve: "",
      nm_approve: "",
      tgl_approve: "",
      status_pb: "",
      flag: "",
      flag_1: "",
      flag_2: "",
      flag_3: "",
    });

    // Lopping Barang
    for (let i = 0; i < barang.length; i++) {
      // ===== Barang
      const getBarang = await Barang.findOne({
        where: {
          kd_brg: barang[i].kode_barang,
        },
      });

      const barangData = await getBarang["dataValues"];

      const { stock, request, keterangan } = barang[i].requestData;

      const ID_TRANS = `${anakCabang.kd_cabang}${ID_PB}${generateRandomNumber(
        100000,
        999999
      )}`;

      const jumlahSatuan = request * barangData.qty_satuan;

      await TrxPermintaanBarang.create({
        id_trans: ID_TRANS,
        id_pb: ID_PB,
        id_pr: "",
        kd_induk: indukCabang.kd_induk,
        nm_induk: indukCabang.nm_induk,
        kd_comp: indukCabang.kd_comp,
        nm_comp: indukCabang.nm_comp,
        kd_cabang: anakCabang.kd_cabang,
        nm_cabang: anakCabang.nm_cabang,
        kdsp: barangData.kdsp,
        nmsp: barangData.nmsp,
        kd_brg: barangData.kd_brg,
        barcode_brg: barangData.barcode_brg,
        nm_barang: barangData.nm_barang,
        grup_brg: barangData.grup_brg,
        kategory_brg: barangData.kategory_brg,
        nm_kemasan: barangData.nm_kemasan,
        nm_satuan: barangData.nm_satuan,
        qty_satuan: barangData.qty_satuan,
        jml_satuan: jumlahSatuan,
        nm_satuan1: barangData.nm_satuan,
        jml_kemasan: request,
        nm_kemasan1: barangData.nm_kemasan,
        qty_stock: stock,
        nm_kemasanstock: barangData.nm_kemasan,
        keterangan: keterangan,
        tgl_trans: REQUEST_DATE,
        jam: REQUEST_TIME,
        iduser: userData.iduser,
        nm_user: userData.nm_user,
        status_approve: "",
        id_approve: "",
        nm_approve: "",
        tgl_approve: "",
        status_pb: "",
        flag: "",
        flag_1: "",
      });
    }

    Responder(
      res,
      "OK",
      null,
      { savedTrx: true, message: "Berhasil menambahkan barang!" },
      200
    );
    return;
  } catch (error) {
    console.log(error);
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};

exports.getAllRequestBarang = async (req, res) => {
  const { authorization } = req.headers;
  const { page = 1, limit = 25 } = req.query;
  try {
    const userData = decodeToken(getToken(authorization));

    // Menghitung offset berdasarkan halaman dan batasan
    const offset = (page - 1) * limit;

    const requestList = await PermintaanBarang.findAndCountAll({
      where: {
        iduser: userData.iduser,
      },
      limit: parseInt(limit),
      offset: offset,
      order: [["tgl_trans", "DESC"]],
    });

    // result count
    const resultCount = requestList?.count;

    const totalPage = resultCount / limit;
    const totalPageFormatted =
      Math.round(totalPage) == 0 ? 1 : Math.ceil(totalPage);

    Responder(
      res,
      "OK",
      null,
      {
        rows: requestList.rows,
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

exports.getDetailPermintaan = async (req, res) => {
  const { id_pb } = req.query;
  try {
    const getPermintaan = await TrxPermintaanBarang.findAll({
      where: {
        id_pb: id_pb,
      },
      attributes: [
        "kd_brg",
        "nm_barang",
        "grup_brg",
        "kategory_brg",
        "nm_kemasan",
        "nm_satuan",
        "qty_satuan",
        "jml_satuan",
        "nm_satuan1",
        "jml_kemasan",
        "nm_kemasan1",
        "qty_stock",
        "nm_kemasanstock",
        "keterangan",
        "status_approve",
        "tgl_approve",
      ],
    });

    Responder(res, "OK", null, getPermintaan, 200);
    return;
  } catch (error) {
    Responder(res, "ERROR", null, null, 400);
    return;
  }
};
