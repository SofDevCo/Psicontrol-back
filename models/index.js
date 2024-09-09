const {User} = require('./userModel');
const {Customer} = require('./customerModel');
const {CustomersBillingRecords} = require('./customersBillingRecordsModel');
const {ExpensesAndRevenues}= require('./ExpenseAndRevenuesModel');
const {Evento} = require('../models/eventModel')
const {Calendar} = require('../models/calendarModel')


User.hasMany(Customer, { foreignKey: 'user_id' });
Customer.belongsTo(User, { foreignKey: 'user_id' });

Customer.hasMany(CustomersBillingRecords, { foreignKey: 'customer_id' });
CustomersBillingRecords.belongsTo(Customer, { foreignKey: 'customer_id' });

User.hasMany(ExpensesAndRevenues, { foreignKey: 'user_id' });
ExpensesAndRevenues.belongsTo(User, { foreignKey: 'user_id' });

Evento.belongsTo(Calendar, { foreignKey: 'calendar_id' });

module.exports = {
    User,
    Customer,
    CustomersBillingRecords,
    ExpensesAndRevenues,
    Evento,
    Calendar
  };
  