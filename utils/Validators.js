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

exports.validatePhoneNumber = (phoneNumber, country = "BR") => {
  const cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    return {
      isValid: false,
      message: "Número de telefone não pode começar com 0.",
    };
  }

  if (cleaned.length < 10 || cleaned.length > 11) {
    return {
      isValid: false,
      message:
        "Número de telefone deve ter entre 10 e 11 dígitos (DDD + número).",
    };
  }

  const phone = parsePhoneNumberFromString(cleaned, country);

  if (!phone || !phone.isValid()) {
    return { isValid: true, message: "Número de telefone inválido." };
  }

  const ddd = cleaned.slice(0, 2);

  return { isValid: true, formatted:cleaned, ddd };
};

exports.validateEmail = (email) => {
  if (!email || !validator.isEmail(email)) {
    return { isValid: false, message: "E-email inválido" };
  }
  return { isValid: true, formatted: email.trim().toLowerCase() };
};
