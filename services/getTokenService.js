const { User } = require("../models");
const { Op } = require("sequelize");
const { oauth2Client } = require("../config/oauth2");

const getAllAccessToken = async () => {
  const users = await User.findAll({
    attributes: ["user_id", "access_token", "refresh_token"],
    where: {
      access_token: { [Op.ne]: null },
      refresh_token: { [Op.ne]: null },
    },
  });
  return users;
};

const refreshAccessToken = async (refreshToken) => {
  const { tokens } = await oauth2Client.refreshToken(refreshToken);
  if (tokens && tokens.access_token) {
    return tokens.access_token;
  }
};

const updateAccessToken = async (userId, newAccessToken) => {
  const user = await User.findByPk(userId);
  if (user) {
    user.access_token = newAccessToken;
    await user.save();
  }
};

module.exports = {
  getAllAccessToken,
  refreshAccessToken,
  updateAccessToken,
};
