from agents.base_agent import BaseAgent
from models.cto_output import CTOOutput


class CTOAgent(BaseAgent):

    def __init__(self):
        super().__init__("CTO Agent")

    def run(self, schema, ceo_output):

        tech_stack = []

        architecture = "General Architecture"

        if any(
            "flutter" in req.lower()
            for req in schema.technical_requirements
        ):

            tech_stack = [
                "Flutter",
                "FastAPI",
                "PostgreSQL"
            ]

            architecture = (
                "Cross-platform mobile architecture"
            )

        elif any(
            "react native" in req.lower()
            for req in schema.technical_requirements
        ):

            tech_stack = [
                "React Native",
                "Node.js",
                "PostgreSQL"
            ]

            architecture = (
                "Cross-platform mobile architecture"
            )

        technical_risks = []

        if any(
            "offline" in req.lower()
            for req in schema.functional_requirements
        ):
            technical_risks.append(
                "Offline synchronization complexity"
            )

        if any(
            "multilingual" in req.lower()
            for req in schema.functional_requirements
        ):
            technical_risks.append(
                "Localization complexity"
            )

        if any(
            "owasp" in req.lower()
            for req in schema.technical_requirements
        ):
            technical_risks.append(
                "Security compliance requirements"
            )

        return CTOOutput(

            architecture=architecture,

            tech_stack=tech_stack,

            technical_risks=technical_risks,

            complexity="High"
        )