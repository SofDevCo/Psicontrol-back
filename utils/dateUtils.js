const { format, parseISO } = require("date-fns");
const { ptBR } = require("date-fns/locale");

exports.formatDateBrazilian = (date) => {
  if (!date) return "";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
};

exports.parseISODate = (isoDate) => {
  if (!isoDate) return null;
  return parseISO(isoDate);
};

exports.parseBrazilianDate = (dateString) => {
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

exports.formatDateIso = (date) => {
  if (!date) return "";

  if (typeof date === "string") {
    date = exports.parseBrazilianDate(date);
  }

  if (isNaN(date)) {
    throw new Error("Data inválida fornecida.");
  }

  return format(date, "yyyy-MM-dd", { locale: ptBR });
};
