module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('meetings', 'banners_id', {
      type: Sequelize.INTEGER,
      references: { model: 'banners', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      allowNull: true,
    });
  },

  down: queryInterface => {
    return queryInterface.removeColumn('meetings', 'banners_id');
  },
};
