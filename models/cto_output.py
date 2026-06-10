from pydantic import BaseModel
from typing import List


class CTOOutput(BaseModel):

    architecture: str

    tech_stack: List[str]

    technical_risks: List[str]

    complexity: str