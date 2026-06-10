from agents.base_agent import BaseAgent
from models.pm_output import PMOutput


class PMAgent(BaseAgent):

    def __init__(self):
        super().__init__("PM Agent")

    def run(self, schema, ceo_output):

        milestones = []

        for item in schema.milestones:

            if item.startswith("Milestone"):

                milestones.append(item)

        timeline = (
            "Requirements → Development → Testing → "
            "Deployment → Maintenance"
        )

        delivery_risks = []

        if any(
            "cert-in" in risk.lower()
            for risk in schema.risks
        ):
            delivery_risks.append(
                "CERT-In audit delays"
            )

        if any(
            "app store" in risk.lower()
            for risk in schema.risks
        ):
            delivery_risks.append(
                "App Store approval delays"
            )

        delivery_risks.append(
            "Scope creep"
        )

        delivery_risks.append(
            "Resource constraints"
        )

        return PMOutput(

            timeline=timeline,

            milestones=milestones,

            delivery_risks=delivery_risks
        )