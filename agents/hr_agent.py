from agents.base_agent import BaseAgent
from models.hr_output import HROutput


class HRAgent(BaseAgent):

    def __init__(self):
        super().__init__("HR Agent")

    def run(self, schema, ceo_output):

        roles = []

        if schema.resource_requirements:

            roles.extend(
                schema.resource_requirements
            )

        else:

            roles = [
                "Project Manager",
                "Business Analyst",
                "Flutter Developer",
                "Backend Developer",
                "QA Engineer",
                "DevOps Engineer"
            ]

        roles = list(dict.fromkeys(roles))

        return HROutput(

            roles=roles,

            estimated_team_size=len(roles),

            staffing_risks=[
                "Resource availability",
                "Skill gap risk",
                "Hiring delays"
            ]
        )