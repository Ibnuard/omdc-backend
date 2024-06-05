const express = require("express");

const router = express.Router();

// controllers
const dev = require("../controllers/dev.controller");
const ruser = require("../controllers/ruser.controller");
const muser = require("../controllers/muser.controller");
const reimbursement = require("../controllers/reimbursement.controller");
const bank = require("../controllers/bank.controller");
const superuser = require("../controllers/superuser.controller");
const barang = require("../controllers/barang.controller");
const pengumuman = require("../controllers/pengumuman.controller");
const dept = require("../controllers/dept.controller");
const coa = require("../controllers/coa.controller");
const suplier = require("../controllers/suplier.controller");
const icon = require("../controllers/icon.controller");
const maker = require("../controllers/maker.controller");
const adminpb = require("../controllers/adminpb.controller");
const { authenticateToken } = require("../utils/jwt");

// routes

// Dev
router.use("/dev", dev.create);
router.get("/devs", dev.getDevs);

// Dept
router.post("/dept", dept.create);
router.get("/dept", dept.get);
router.delete("/dept/:id", dept.delete);

// User
router.post("/user/login", ruser.login);
router.post("/user/complete/:id", ruser.completeUser);
router.post("/user/update-password", ruser.updatePw);
router.post("/user/logout", ruser.logout);

// Reimbursement
router.get("/cabang", reimbursement.cabang);
router.post("/reimbursement", reimbursement.reimbursement);
router.get("/reimbursement", reimbursement.get_reimbursement);
router.post("/reimbursement/status/:id", reimbursement.acceptance);
router.post("/reimbursement/extra/:id", reimbursement.acceptExtraReimbursement);
router.get("/reimbursement/status/:id", reimbursement.get_status);
router.get("/reimbursement/:id", reimbursement.get_detail);
router.delete("/reimbursement/:id", reimbursement.cancel_upload);

// Bank
router.get("/bank", bank.getBank);
router.get("/bank/name", bank.getBankAccName);

// M User
router.get("/muser", muser.getUser);

//  Super User
router.post("/superuser", superuser.createUser);
router.get("/superuser", superuser.getUser);
router.get("/superuser/userlist", superuser.getAllUsers);
router.get("/superuser/pengajuan", superuser.get_pengajuan);
router.get("/superuser/user", superuser.getUserDetail);
router.get("/superuser/reimbursement", reimbursement.get_super_reimbursement);
router.get(
  "/superuser/reimbursement/report",
  reimbursement.get_super_reimbursement_report
);
router.get("/superuser/barang", barang.getAllRequestBarangAdmin);

// Reviewer
router.get("/reviewer/reimbursement", reimbursement.get_review_reimbursement);
router.post(
  "/reviewer/accept/:id",
  reimbursement.acceptReviewReimbursementData
);

// Maker
router.get("/maker/reimbursement", maker.get_reimbursement);
router.post("/maker/accept/:id", maker.acceptMakerReimbursement);

// finance
router.get("/finance/pengajuan", superuser.get_pengajuan_finance);
router.post("/finance/acceptance/:id", reimbursement.finance_acceptance);
router.delete("/superuser/delete/:iduser", superuser.deleteAdmin);
router.post("/finance/update-coa/:id", reimbursement.finance_update_coa);

// Barang
router.get("/anakcabang", barang.getAllAnakCabang);
router.get("/anakcabang/detail", barang.getCabangDetail);
router.get("/barang", barang.getBarang);
router.post("/barang/create", barang.createTrxPermintaan);
router.get("/barang/requested", barang.getAllRequestBarang);
router.get("/barang/requested/detail", barang.getDetailPermintaan);
router.post("/barang/admin-approval/:idpb/:mode", barang.admin_approval);

// Pengumuman
router.post("/pengumuman", pengumuman.createPengumuman);
router.get("/pengumuman", pengumuman.getPengumuman);
router.delete(
  "/pengumuman/:pid",

  pengumuman.deletePengumuman
);
router.get(
  "/pengumuman/count",

  pengumuman.getPengumumanCount
);
router.post(
  "/pengumuman/read/:id",

  pengumuman.readPengumuman
);

// COA
router.get("/coa", coa.getCOA);
router.delete("/coa/:id", coa.deleteCOA);
router.post("/coa/:id", coa.updatecreateCOA);

// Suplier
router.get("/suplier", suplier.getSuplier);
router.get("/suplier/:kdsp", suplier.getSuplierDetail);

// Icon
router.get("/icon", icon.getIcon);
router.post("/updateIcon", icon.updateIcon);

// Admin PB
router.post("/adminpb/:iduser", adminpb.add_admin);
router.delete("/adminpb/:iduser", adminpb.delete_admin);
router.get("/adminpb", adminpb.get_admin);

module.exports = { router };
