const { recalculateAllConsultationDays} = require("../utils/updateConsultationDays");

(async () => {
    try {
      console.log("Iniciando recalculo de consultation_days...");
      await recalculateAllConsultationDays();
      console.log("Recalculo concluído!");
    } catch (error) {
      console.error("Erro ao recalcular consultation_days:", error);
    }
  })();