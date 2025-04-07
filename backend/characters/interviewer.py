from characters.character import Character

class Interviewer(Character):
    """
    Extended class for an Interviewer, inherits from Character.
    Adds job-specific attributes like job description, interviewee resume, and company name.
    """
    def __init__(
        self,
        name="",
        personality="",
        age="",
        language="",
        job_description="",
        interviewee_resume="",
        company_name="",
        **kwargs
    ):
        super().__init__(name, personality, age, language, **kwargs)
        self.job_description = job_description
        self.interviewee_resume = interviewee_resume
        self.company_name = company_name

    def __repr__(self):
        base_repr = super().__repr__()
        return (
            f"Interviewer({base_repr}, "
            f"job_description={self.job_description}, "
            f"interviewee_resume={self.interviewee_resume}, "
            f"company_name={self.company_name})"
        )
