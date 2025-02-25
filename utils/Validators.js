const { cpf, cnpj } = require("cpf-cnpj-validator");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const validator = require("validator");

exports.validateCPFOrCNPJ = (documentNumber) => {
  const cleanNumber = documentNumber.replace(/\D/g, "");

  if (cleanNumber.length <= 11) {
    return cpf.isValid(cleanNumber);
  } else {
    return cnpj.isValid(cleanNumber);
  }
};

exports.validatePhoneNumber = (
  phoneNumber,
  country = "BR",
  defaultDDD = "53"
) => {
  if (!phoneNumber) {
    return null;
  }

  let cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    return null;
  }

  if (cleaned.length === 8 || cleaned.length === 9) {
    cleaned = defaultDDD + cleaned;
  }

  if (cleaned.length < 10 || cleaned.length > 11) {
    return null;
  }

  return cleaned;
};

exports.validateEmail = (email) => {
  if (!email || !validator.isEmail(email)) {
    return { isValid: false, message: "E-email inválido" };
  }
  return { isValid: true, formatted: email.trim().toLowerCase() };
};
