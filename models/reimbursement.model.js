module.exports = (sequelize, Sequelize) => {
  const Reimbursement = sequelize.define("reimbursement", {
    no_doc: {
      type: Sequelize.TEXT,
    },
    jenis_reimbursement: {
      type: Sequelize.TEXT,
    },
    tanggal_reimbursement: {
      type: Sequelize.TEXT,
    },
    kode_cabang: {
      type: Sequelize.STRING,
    },
    requester_id: {
      type: Sequelize.STRING,
    },
    requester: {
      type: Sequelize.JSON,
    },
    name: {
      type: Sequelize.TEXT,
    },
    coa: {
      type: Sequelize.TEXT,
    },
    item: {
      type: Sequelize.JSON,
    },
    description: {
      type: Sequelize.TEXT,
    },
    nominal: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.STRING,
    },
    status_finance: {
      type: Sequelize.STRING,
    },
    finance_by: {
      type: Sequelize.JSON,
    },
    attachment: {
      type: Sequelize.TEXT("long"),
    },
    bank_detail: {
      type: Sequelize.JSON,
    },
    file_info: {
      type: Sequelize.JSON,
    },
    note: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    accepted_date: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    accepted_by: {
      type: Sequelize.JSON,
      allowNull: true,
    },
  });

  return Reimbursement;
};
