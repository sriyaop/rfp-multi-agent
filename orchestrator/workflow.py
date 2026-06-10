from agents.ceo_agent import CEOAgent
from agents.cto_agent import CTOAgent
from agents.pm_agent import PMAgent
from agents.cfo_agent import CFOAgent
from agents.hr_agent import HRAgent

class RFPWorkflow:

    def __init__(self):

        self.ceo = CEOAgent()
        self.cto = CTOAgent()
        self.pm = PMAgent()
        self.cfo = CFOAgent()
        self.hr = HRAgent()  

    def run(self, schema):

        ceo_output = self.ceo.run(schema)

        cto_output = self.cto.run(
            schema,
            ceo_output
        )

        pm_output = self.pm.run(
            schema,
            ceo_output
        )

        cfo_output = self.cfo.run(
            schema,
            ceo_output
        )

        hr_output = self.hr.run(
            schema,
            ceo_output
        )

        return {
            "schema": schema,
            "ceo": ceo_output,
            "cto": cto_output,
            "pm": pm_output,
            "cfo": cfo_output,
            "hr": hr_output
        }