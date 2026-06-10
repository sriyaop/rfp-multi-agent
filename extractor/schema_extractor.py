import re

from models.rfp_schema import RFPSchema


class SchemaExtractor:

    def extract_section(
        self,
        text,
        start_heading,
        end_heading
    ):

        pattern = (
            rf"{re.escape(start_heading)}"
            rf"(.*?)"
            rf"{re.escape(end_heading)}"
        )

        match = re.search(
            pattern,
            text,
            re.DOTALL | re.IGNORECASE
        )

        if match:
            return match.group(1).strip()

        return ""

    def extract_bullets(self, section_text):

        items = []

        skip_words = {

            "features include:",
            "support for:",
            "educational components include:",
            "the application should provide:",
            "the application should support:",
            "communication features include:",
            "supported platforms:",
            "capabilities include:",
            "special requirement:",
            "acceptable approaches include:",
            "backend systems should include:",
            "infrastructure should support:",
            "vendor responsibilities include:",
            "the system must integrate with:",

            "data security",
            "credential protection",
            "security standards",
            "mandatory security audit",

            "project start",
            "immediately upon:",
            "key milestones",

            "includes:",
            "role",
            "suggested allocation",
            "key responsibilities",

            "technical risks",
            "timeline risks",
            "compliance risks",
            "operational risks"
        }

        for line in section_text.splitlines():

            line = line.strip()

            if not line:
                continue

            if line == "•":
                continue

            if len(line) < 3:
                continue

            if re.fullmatch(r"\d+", line):
                continue

            if line.lower() in skip_words:
                continue

            if re.match(r"^\d+$", line):
                continue
            if line == "•":
                continue

            if len(line.replace("•", "").strip()) == 0:
                continue

            items.append(line)

        return items
    


    def extract(self, text):

        schema = RFPSchema()

        # ----------------------------------
        # Project Name
        # ----------------------------------

        project_match = re.search(
            r'"title"\s*:\s*"([^"]+)"',
            text,
            re.IGNORECASE
        )

        if project_match:
            schema.project_name = (
                project_match.group(1)
                .replace("\n", " ")
                .strip()
            )

        elif "mobile application" in text.lower():

            schema.project_name = (
                "Mobile Application"
            )

        elif "website" in text.lower():

            schema.project_name = (
                "Website Project"
            )

        # ----------------------------------
        # Client Name
        # ----------------------------------

        client_match = re.search(
            r"Organization Name\s*:\s*(.+)",
            text
        )

        if client_match:

            schema.client_name = (
                client_match.group(1).strip()
            )

        # ----------------------------------
        # Industry
        # ----------------------------------

        industry_match = re.search(
            r"Industry\/Domain:\s*(.+)",
            text
        )

        if industry_match:

            schema.industry = (
                industry_match.group(1).strip()
            )

        # ----------------------------------
        # Objective
        # ----------------------------------

        objective_match = re.search(
            r"What Is the Overall Project Objective\?(.*?)(?:2\. Client Information)",
            text,
            re.DOTALL | re.IGNORECASE
        )

        if objective_match:

            schema.project_objective = (
                objective_match.group(1)
                .replace("\n", " ")
                .replace("•", "")
                .strip()
            )
        # -------------------------
        # Business Problem
        # -------------------------

        problem_match = re.search(
            r"What Business Problem Are They Solving\?(.*?)What Is the Overall Project Objective\?",
            text,
            re.DOTALL | re.IGNORECASE
        )

        if problem_match:
            schema.business_problem = " ".join(
                problem_match.group(1).split()
            )
        # -------------------------
        # Included Services
        # -------------------------

        scope_section = self.extract_section(
            text,
            "3. Project Scope",
            "4. Functional Requirements"
        )

        schema.included_services = self.extract_bullets(
            scope_section
        )
        # ----------------------------------
        # Functional Requirements
        # ----------------------------------

        functional_section = self.extract_section(
            text,
            "4. Functional Requirements",
            "5. Technical Requirements"
        )

        schema.functional_requirements = (
            self.extract_bullets(
                functional_section
            )
        )

        # ----------------------------------
        # Technical Requirements
        # ----------------------------------

        technical_section = self.extract_section(
            text,
            "5. Technical Requirements",
            "6. Timeline and Milestones"
        )

        schema.technical_requirements = (
            self.extract_bullets(
                technical_section
            )
        )

        # ----------------------------------
        # Milestones
        # ----------------------------------

        milestone_section = self.extract_section(
            text,
            "6. Timeline and Milestones",
            "7. Budget and Commercial Information"
        )

        schema.milestones = (
            self.extract_bullets(
                milestone_section
            )
        )

        # ----------------------------------
        # Budget
        # ----------------------------------

        budget_section = self.extract_section(
            text,
            "7. Budget and Commercial Information",
            "8. Resource Requirements"
        )

        schema.budget = {
            "raw_text": budget_section
        }

        # ----------------------------------
        # Resource Requirements
        # ----------------------------------

        resource_section = self.extract_section(
            text,
            "8. Resource Requirements",
            "9. Risks and Challenges"
        )

        roles = []

        possible_roles = [

            "Project Manager",

            "Business Analyst",

            "Frontend Developers",

            "Backend Developers",

            "QA Engineers",

            "DevOps Engineer"
        ]

        for role in possible_roles:

            if role in resource_section:

                roles.append(role)

        schema.resource_requirements = roles

        # ----------------------------------
        # Risks
        # ----------------------------------

        risk_section = self.extract_section(
            text,
            "9. Risks and Challenges",
            "10. Evaluation Criteria"
        )

        schema.risks = (
            self.extract_bullets(
                risk_section
            )
        )

        # ----------------------------------
        # Evaluation Criteria
        # ----------------------------------

        evaluation_section = self.extract_section(
            text,
            "10. Evaluation Criteria",
            "11. Proposal Submission Requirements"
        )

        schema.evaluation_criteria = (
            self.extract_bullets(
                evaluation_section
            )
        )

        # ----------------------------------
        # Submission Requirements
        # ----------------------------------

        submission_section = self.extract_section(
            text,
            "11. Proposal Submission Requirements",
            "12. Information Useful for AI Agents"
        )

        schema.submission_requirements = (
            self.extract_bullets(
                submission_section
            )
        )
        # -------------------------
        # Deliverables
        # -------------------------

        deliverables_match = re.search(
            r"Expected Deliverables(.*?)Explicit Exclusions",
            text,
            re.DOTALL | re.IGNORECASE
        )

        if deliverables_match:

            deliverable_text = deliverables_match.group(1)

            schema.deliverables = self.extract_bullets(
                deliverable_text
            )

        return schema
    
