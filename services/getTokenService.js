const {User} = require('../models');
const {Op} = require('sequelize');
const { oauth2Client } = require('../config/oauth2');

const getAllAccessToken = async () => {
    try{
        console.log('Fetching all access tokens...');
        const users = await User.findAll({
            attributes: ['user_id','access_token','refresh_token'],
            where:{                                                                                                                 
                access_token: { [Op.ne]: null},
                refresh_token: {[Op.ne]: null}
            }
        });
        console.log('Users fetched:', users);
        return users;                                
    }catch(error){
        console.error('Error fetching access tokens:', error);
        throw error;
    }
}

const refreshAccessToken = async (refreshToken) => {
    try {
        const { tokens } = await oauth2Client.refreshToken(refreshToken);
        if (tokens && tokens.access_token) {
            console.log('New tokens:', tokens);
            return tokens.access_token;
        } else {
            throw new Error('No access token received from refreshToken.');
        }
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
};
const updateAccessToken = async(userId, newAccessToken) => {
    try{
        const user = await User.findByPk(userId);
        if(user){
            user.access_token = newAccessToken;
            await user.save();
            console.log(`Access token updated for user ${userId}: ${newAccessToken}`);
        }else{
            console.error(`User with ID ${userId} not found.`);
        }
    }catch(error){
        console.error('Error updating access token in database:', error);
        throw error;
    }
}

module.exports={
    getAllAccessToken,
    refreshAccessToken,
    updateAccessToken
}
