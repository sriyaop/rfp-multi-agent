from pydantic import BaseModel
from typing import List


class PMOutput(BaseModel):

    timeline: str

    milestones: List[str]

    delivery_risks: List[str]