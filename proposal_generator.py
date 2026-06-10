from models.proposal_output import ProposalOutput


class ProposalGenerator:

    def generate(
        self,
        schema,
        ceo_output,
        cto_output,
        pm_output,
        cfo_output,
        hr_output
    ):

        executive_summary = (
            f"We propose to deliver the "
            f"{schema.project_name} for "
            f"{schema.client_name}."
        )

        understanding_of_requirements = (
            f"The client requires a "
            f"{schema.project_name} to achieve the "
            f"following objective:\n\n"
            f"{schema.project_objective}"
        )

        proposed_solution = (
            f"The solution will use "
            f"{cto_output.architecture} "
            f"with a scalable backend architecture "
            f"designed for performance, security, "
            f"and future growth."
        )

        key_features = (
            schema.functional_requirements[:15]
        )

        risks = list(
            dict.fromkeys(
                schema.risks
                + cto_output.technical_risks
                + cfo_output.financial_risks
            )
        )
        return ProposalOutput(

            executive_summary=executive_summary,

            understanding_of_requirements=
            understanding_of_requirements,

            proposed_solution=
            proposed_solution,

            technology_stack=
            cto_output.tech_stack,

            key_features=
            key_features,

            milestones=
            pm_output.milestones,

            team_structure=
            hr_output.roles,

            estimated_budget=
            cfo_output.estimated_budget,

            risks=risks
        )