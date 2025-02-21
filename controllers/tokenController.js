const { User } = require("../models");

const saveTokens = async (name, email, accessToken, refreshToken) => {
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
};

module.exports = { saveTokens };