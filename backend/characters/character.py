# interview_agent.py

class Character:
    """
    Base class representing a general Character for LLM Agents.
    All attributes can be empty or a string.
    """
    def __init__(self, name="", personality="", age="", language="", **kwargs):
        self.name = name
        self.personality = personality
        self.age = age
        self.language = language
        # Any other arbitrary attributes from kwargs
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __repr__(self):
        # A simple textual representation
        return (
            f"Character(name={self.name}, personality={self.personality}, "
            f"age={self.age}, language={self.language})"
        )
