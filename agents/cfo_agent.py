from agents.base_agent import BaseAgent
from models.cfo_output import CFOOutput


class CFOAgent(BaseAgent):

    def __init__(self):
        super().__init__("CFO Agent")

    def run(self, schema, ceo_output):

        feature_count = len(
            schema.functional_requirements
        )

        if feature_count > 40:

            estimated_budget = (
                "$250K - $500K"
            )

        elif feature_count > 20:

            estimated_budget = (
                "$100K - $250K"
            )

        else:

            estimated_budget = (
                "$50K - $100K"
            )

        cost_drivers = [

            "Mobile Development",

            "Backend Development",

            "Security Compliance",

            "Testing",

            "Maintenance",

            "Infrastructure"
        ]

        financial_risks = [

            "Budget Overrun",

            "Requirement Changes",

            "Extended Maintenance Costs",

            "Compliance Costs"
        ]

        return CFOOutput(

            estimated_budget=estimated_budget,

            cost_drivers=cost_drivers,

            financial_risks=financial_risks
        )