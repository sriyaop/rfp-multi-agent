from pydantic import BaseModel, Field
from typing import List, Dict


class RFPSchema(BaseModel):

    # Metadata
    client_name: str = ""
    project_name: str = ""
    industry: str = ""

    # Business
    business_problem: str = ""
    project_objective: str = ""

    # Scope
    deliverables: List[str] = Field(default_factory=list)
    included_services: List[str] = Field(default_factory=list)

    # Requirements
    functional_requirements: List[str] = Field(default_factory=list)
    technical_requirements: List[str] = Field(default_factory=list)

    # Schedule
    milestones: List[str] = Field(default_factory=list)

    # Budget
    budget: Dict = Field(default_factory=dict)

    # Resources
    resource_requirements: List[str] = Field(default_factory=list)

    # Risks
    risks: List[str] = Field(default_factory=list)

    # Evaluation
    evaluation_criteria: List[str] = Field(default_factory=list)

    # Submission
    submission_requirements: List[str] = Field(default_factory=list)