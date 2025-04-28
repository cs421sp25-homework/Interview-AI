import pytest
from unittest.mock import MagicMock, patch
from characters.character import Character
from characters.interviewer import Interviewer

class TestCharacter:
    def test_character_initialization(self):
        """Test that Character initializes with correct attributes"""
        character = Character(name="Test Character", role="Test Role")
        assert character.name == "Test Character"
        assert character.role == "Test Role"
    
    def test_character_attributes(self):
        """Test character attributes"""
        character = Character(name="Test Character", role="Test Role")
        assert hasattr(character, "name")
        assert hasattr(character, "role")

class TestInterviewer:
    def test_interviewer_initialization(self):
        """Test that Interviewer initializes with correct attributes"""
        interviewer = Interviewer(
            name="Interviewer", 
            role="HR",
            company_name="Test Company"
        )
        assert interviewer.name == "Interviewer"
        assert interviewer.role == "HR"
        assert interviewer.company_name == "Test Company"
    
    def test_interviewer_inheritance(self):
        """Test that Interviewer inherits from Character"""
        interviewer = Interviewer(name="Interviewer", role="HR")
        assert isinstance(interviewer, Character) 