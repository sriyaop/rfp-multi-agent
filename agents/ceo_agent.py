from agents.base_agent import BaseAgent
from models.ceo_output import CEOOutput


class CEOAgent(BaseAgent):

    def __init__(self):
        super().__init__("CEO Agent")

    def run(self, schema):

        priorities = []

        if schema.project_name:
            priorities.append(
                f"Successfully deliver {schema.project_name}"
            )

        if schema.project_objective:
            priorities.append(
                "Achieve business objectives"
            )

        return CEOOutput(

            project_type=schema.project_name,

            business_summary=schema.project_objective,

            priorities=priorities,

            risks=[
                "Timeline risk",
                "Technical complexity risk"
            ],

            delegation_tasks={

                "CTO":
                "Design technical architecture and recommend technology stack",

                "PM":
                "Create roadmap, milestones and delivery strategy",

                "CFO":
                "Estimate budget and financial feasibility"
            }
        )