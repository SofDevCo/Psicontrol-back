const { format, parseISO } = require("date-fns");
const { ptBR } = require("date-fns/locale");

exports.isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

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

  const parsedDate = new Date(year, month, day);

  if (!exports.isValidDate(parsedDate)) {
    return null;
  }

  return parsedDate;
};

exports.formatDateIso = (date) => {
  if (!date) return "";

  if (typeof date === "string") {
    date = exports.parseBrazilianDate(date);
  }

  const year = date.getFullYear();
  if (
    !exports.isValidDate(date) ||
    year < 1900 ||
    year > new Date().getFullYear()
  ) {
    return "";
  }

  return format(date, "yyyy-MM-dd", { locale: ptBR });
};

exports.calculateAge = (dateOfBirth) => {
  if(!dateOfBirth){
    return null;
  }

  const dob = new Date(dateOfBirth);
  
  if (isNaN(dob)) {
    return null;
  }

 
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const monthDifference = today.getMonth() - dob.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
};
