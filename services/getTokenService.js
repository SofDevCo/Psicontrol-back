const { User } = require("../models");
const { Op } = require("sequelize");
const { oauth2Client } = require("../config/oauth2");

const getAllAccessToken = async () => {
  try {
    const users = await User.findAll({
      attributes: ["user_id", "access_token", "refresh_token"],
      where: {
        access_token: { [Op.ne]: null },
        refresh_token: { [Op.ne]: null },
      },
    });

    return users;
  } catch (error) {}
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const { tokens } = await oauth2Client.refreshToken(refreshToken);
    if (tokens && tokens.access_token) {
      return tokens.access_token;
    }
  } catch (error) {}
};
const updateAccessToken = async (userId, newAccessToken) => {
  try {
    const user = await User.findByPk(userId);
    if (user) {
      user.access_token = newAccessToken;
      await user.save();
    }
  } catch (error) {}
};

module.exports = {
  getAllAccessToken,
  refreshAccessToken,
  updateAccessToken,
};
