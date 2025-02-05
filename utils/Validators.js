const {cpf, cnpj} = require('cpf-cnpj-validator')

exports.validateCPFOrCNPJ = (documentNumber) => {
    const cleanNumber = documentNumber.replace(/\D/g, "");

    if(cleanNumber.length <= 11) {
        return cpf.isValid(cleanNumber);
    }else {
        return cnpj.isValid(cleanNumber);
    }
};
