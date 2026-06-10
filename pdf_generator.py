from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer
)

from reportlab.lib.styles import (
    getSampleStyleSheet
)


class PDFGenerator:

    def generate(self, proposal, output_path):

        doc = SimpleDocTemplate(
            output_path
        )

        styles = getSampleStyleSheet()

        elements = []

        # Title

        elements.append(
            Paragraph(
                "Project Proposal",
                styles["Title"]
            )
        )

        elements.append(
            Spacer(1, 20)
        )

        # Executive Summary

        elements.append(
            Paragraph(
                "1. Executive Summary",
                styles["Heading1"]
            )
        )

        elements.append(
            Paragraph(
                proposal.executive_summary,
                styles["BodyText"]
            )
        )

        elements.append(
            Spacer(1, 12)
        )

        # Understanding

        elements.append(
            Paragraph(
                "2. Understanding of Requirements",
                styles["Heading1"]
            )
        )

        elements.append(
            Paragraph(
                proposal.understanding_of_requirements,
                styles["BodyText"]
            )
        )

        elements.append(
            Spacer(1, 12)
        )

        # Solution

        elements.append(
            Paragraph(
                "3. Proposed Solution",
                styles["Heading1"]
            )
        )

        elements.append(
            Paragraph(
                proposal.proposed_solution,
                styles["BodyText"]
            )
        )

        elements.append(
            Spacer(1, 12)
        )

        # Features

        elements.append(
            Paragraph(
                "4. Key Features",
                styles["Heading1"]
            )
        )

        for feature in proposal.key_features:

            elements.append(
                Paragraph(
                    f"• {feature}",
                    styles["BodyText"]
                )
            )

        elements.append(
            Spacer(1, 12)
        )

        # Tech Stack

        elements.append(
            Paragraph(
                "5. Technology Stack",
                styles["Heading1"]
            )
        )

        for tech in proposal.technology_stack:

            elements.append(
                Paragraph(
                    f"• {tech}",
                    styles["BodyText"]
                )
            )

        elements.append(
            Spacer(1, 12)
        )

        # Milestones

        elements.append(
            Paragraph(
                "6. Delivery Milestones",
                styles["Heading1"]
            )
        )

        for milestone in proposal.milestones:

            elements.append(
                Paragraph(
                    f"• {milestone}",
                    styles["BodyText"]
                )
            )

        elements.append(
            Spacer(1, 12)
        )

        # Budget

        elements.append(
            Paragraph(
                "7. Estimated Budget",
                styles["Heading1"]
            )
        )

        elements.append(
            Paragraph(
                proposal.estimated_budget,
                styles["BodyText"]
            )
        )

        elements.append(
            Spacer(1, 12)
        )

        # Risks

        elements.append(
            Paragraph(
                "8. Risks and Mitigation",
                styles["Heading1"]
            )
        )

        for risk in proposal.risks:

            elements.append(
                Paragraph(
                    f"• {risk}",
                    styles["BodyText"]
                )
            )

        doc.build(elements)