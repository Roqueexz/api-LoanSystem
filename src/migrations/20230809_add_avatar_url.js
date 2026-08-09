// Migration to add avatar_url column to usuario table
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuario', 'avatar_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuario', 'avatar_url');
  },
};
