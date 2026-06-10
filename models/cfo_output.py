from pydantic import BaseModel
from typing import List


class CFOOutput(BaseModel):

    estimated_budget: str

    cost_drivers: List[str]

    financial_risks: List[str]