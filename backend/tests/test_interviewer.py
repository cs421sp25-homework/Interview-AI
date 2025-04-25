import pytest
from characters.interviewer import Interviewer

class TestInterviewer:
    def test_interviewer_initialization(self):
        """Test that an Interviewer can be initialized with all required parameters."""
        name = "Test Interviewer"
        personality = "Professional and direct"
        company = "Test Company"
        role = "Software Engineer"
        
        interviewer = Interviewer(
            name=name,
            personality=personality,
            company=company,
            role=role
        )
        
        assert interviewer.name == name
        assert interviewer.personality == personality
        assert interviewer.company == company
        assert interviewer.role == role
    
    def test_interviewer_inheritance(self):
        """Test that Interviewer inherits from Character."""
        from characters.character import Character
        
        interviewer = Interviewer(
            name="Test",
            personality="Direct",
            company="Test Co",
            role="Developer"
        )
        
        assert isinstance(interviewer, Character)
    
    def test_interviewer_attributes(self):
        """Test that an Interviewer has all expected attributes."""
        interviewer = Interviewer(
            name="Test",
            personality="Direct",
            company="Test Co",
            role="Developer"
        )
        
        # Check that all expected attributes exist
        assert hasattr(interviewer, 'name')
        assert hasattr(interviewer, 'personality')
        assert hasattr(interviewer, 'company')
        assert hasattr(interviewer, 'role')
    
    # def test_interviewer_str_representation(self):
    #     """Test the string representation of an Interviewer."""
    #     name = "Test Interviewer"
    #     company = "Test Company"
    #     interviewer = Interviewer(
    #         name=name,
    #         personality="Direct",
    #         company=company,
    #         role="Developer"
    #     )
        
    #     # Check that __str__ includes the name and company
    #     interviewer_str = str(interviewer)
    #     assert name in interviewer_str
    #     assert company in interviewer_str 