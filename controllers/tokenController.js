const {User} = require('../models/userModel');

const saveAcessToken = async(email, acessToken) => {
    try {
        await User.update(
            {acces_token: acessToken},
            {where: { user_email: email}}
        );
        console.log(`ACess token atualizado para o usuário com email: ${email}`);
    }catch(error){
        console.error('Erro ao salvar o acess token:',error);
    }
};
const getAccessToken = async(email)=>{
    try{
        const user = await User.findOne({where:{user_email:email}});
        if(user){
            return user.access_token;
        }
        return null;
    }catch(error){
        console.error('Erro ao aobte o acess token:', error)
    }
};

module.exports = {
    saveAcessToken,
    getAccessToken,
}