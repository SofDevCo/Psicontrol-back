const { User } = require("../models");

const saveTokens = async (name, email, accessToken, refreshToken) => {
  if (!email) {
    throw new Error("O email não foi fornecido.");
  }

  try {
    let user = await User.findOne({ where: { user_email: email } });

    if (!user) {
      user = await User.create({
        user_name: name,
        user_email: email,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      user.access_token = accessToken;
      user.refresh_token = refreshToken;
      await user.save();
    }
  } catch (error) {}
};

module.exports = { saveTokens };
