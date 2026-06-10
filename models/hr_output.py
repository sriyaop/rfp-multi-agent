from pydantic import BaseModel
from typing import List


class HROutput(BaseModel):

    roles: List[str]

    estimated_team_size: int

    staffing_risks: List[str]