const { Customer } = require("../models");
const { Event } = require("../models");
const { syncGoogleCalendarWithDatabase } = require("./authController");


exports.getUnmatchedPatients = async (req, res) => {
    try {
      const unmatchedEvents = await Event.findAll({
        where: {
          user_id: req.user.user_id,
          customer_id: null, 
        },
        attributes: ['event_name', 'date'], 
      });
  

      const response = unmatchedEvents.map(event => ({
        name: event.event_name,
        date: event.date,
      }));
  
      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar pacientes não encontrados:", error);
      res.status(500).json({ message: "Erro ao buscar pacientes não encontrados." });
    }
  };