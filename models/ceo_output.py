from pydantic import BaseModel
from typing import List, Dict


class CEOOutput(BaseModel):

    project_type: str

    business_summary: str

    priorities: List[str]

    risks: List[str]

    delegation_tasks: Dict[str, str]

    