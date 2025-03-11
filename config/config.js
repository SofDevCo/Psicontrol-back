require("dotenv").config();

module.exports = {
  development: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
  },
  test: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
  },
  staging: {
    use_env_variable: "DATABASE_URL_STAGING",
    dialect: "postgres",
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
  },
};
