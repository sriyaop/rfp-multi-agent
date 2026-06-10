from pprint import pprint

from extractor.pdf_reader import PDFReader
from extractor.schema_extractor import SchemaExtractor
from orchestrator.workflow import RFPWorkflow
from document_generator import DocumentGenerator
from pdf_generator import PDFGenerator
from proposal_generator import ProposalGenerator

def main():

    print("Started")

    pdf_path = "data/rfps/sample_rfp.pdf"

    # ----------------------------
    # Step 1: Read PDF
    # ----------------------------

    pdf_reader = PDFReader()

    text = pdf_reader.extract_text(pdf_path)
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write(text)

    print("\n===== PDF TEXT PREVIEW =====\n")
    print(text[:1000])

    # ----------------------------
    # Step 2: Extract Schema
    # ----------------------------

    extractor = SchemaExtractor()

    schema = extractor.extract(text)

    print("\n===== EXTRACTED SCHEMA =====\n")

    pprint(schema.model_dump())

    print("\n===== FUNCTIONAL REQUIREMENTS =====")
    pprint(schema.functional_requirements)

    print("\n===== TECHNICAL REQUIREMENTS =====")
    pprint(schema.technical_requirements)

    print("\n===== MILESTONES =====")
    pprint(schema.milestones)

    print("\n===== RISKS =====")
    pprint(schema.risks)

    print("\n===== RESOURCE REQUIREMENTS =====")
    pprint(schema.resource_requirements)

    print("\n===== EVALUATION CRITERIA =====")
    pprint(schema.evaluation_criteria)

    print("\n===== SUBMISSION REQUIREMENTS =====")
    pprint(schema.submission_requirements)

    # ----------------------------
    # Step 3: Run Multi-Agent Workflow
    # ----------------------------

    workflow = RFPWorkflow()

    results = workflow.run(schema)

    generator = ProposalGenerator()

    proposal = generator.generate(
        results["schema"],
        results["ceo"],
        results["cto"],
        results["pm"],
        results["cfo"],
        results["hr"]
    )
    pdf_generator = PDFGenerator()

    pdf_generator.generate(
        proposal,
        "output/proposal.pdf"
    )

    print(
        "\nProposal saved to output/proposal.pdf"
    )    

    print("\n===== GENERATED PROPOSAL =====\n")
    print("\n===== PROPOSAL OUTPUT =====\n")

    pprint(
        proposal.model_dump()
    )

    # ----------------------------
    # Step 4: Display Outputs
    # ----------------------------

    print("\n===== MULTI-AGENT OUTPUT =====\n")

    for agent_name, output in results.items():

        print(f"\n----- {agent_name.upper()} -----\n")

        pprint(output.model_dump())


if __name__ == "__main__":
    main()