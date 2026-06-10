from pydantic import BaseModel
from typing import List


class ProposalOutput(BaseModel):

    executive_summary: str

    understanding_of_requirements: str

    proposed_solution: str

    technology_stack: List[str]

    key_features: List[str]

    milestones: List[str]

    team_structure: List[str]

    estimated_budget: str

    risks: List[str]