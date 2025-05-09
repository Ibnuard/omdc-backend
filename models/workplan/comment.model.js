module.exports = (sequelize, Sequelize) => {
  const WorkplanComment = sequelize.define(
    "workplan_comment",
    {
      replies_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      message: {
        type: Sequelize.TEXT,
      },
      create_by: {
        type: Sequelize.STRING,
      },
      iduser: {
        type: Sequelize.STRING,
      },
      attachment: {
        type: Sequelize.STRING,
      },
      wp_id: {
        type: Sequelize.INTEGER,
      },
    },
    {
      tableName: "omdc_workplan_comment",
      underscore: true,
    }
  );

  WorkplanComment.associate = (models) => {
    WorkplanComment.belongsTo(models.workplan, {
      foreignKey: "wp_id",
      as: "workplan",
    });

    WorkplanComment.hasMany(models.workplan_comment, {
      foreignKey: "replies_to",
      as: "replies", // Alias untuk mengambil reply saat fetch data
    });

    // Komentar bisa punya parent
    WorkplanComment.belongsTo(models.workplan_comment, {
      foreignKey: "replies_to",
      as: "parent", // Alias untuk mengakses parent comment
      onDelete: "SET NULL",
    });
  };

  return WorkplanComment;
};
