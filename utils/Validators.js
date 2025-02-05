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

  if (!cleaned.startsWith("55")) {
    return {
      isValid: false,
      message: "O número de telefone deve começar com 55 (código do Brasil).",
    };
  }

  if (cleaned.length < 12 || cleaned.length > 13) {
    return {
      isValid: false,
      message:
        "Número de telefone deve ter entre 12 e 13 dígitos (55 + DDD + número).",
    };
  }

  const phone = parsePhoneNumberFromString(`+${cleaned}`, country);

  if (!phone || !phone.isValid()) {
    return { isValid: false, message: "Número de telefone inválido." };
  }

  return { isValid: true, formatted: cleaned };
};

exports.validateEmail = (email) => {
  if (!email || !validator.isEmail(email)) {
    return { isValid: false, message: "E-email inválido" };
  }
  return { isValid: true, formatted: email.trim().toLowerCase() };
};
