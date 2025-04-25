import pytest
from characters.character import Character

class TestCharacter:
    def test_character_initialization(self):
        """Test that a Character can be initialized with a name and personality."""
        name = "Test Character"
        personality = "Friendly and professional"
        character = Character(name=name, personality=personality)
        
        assert character.name == name
        assert character.personality == personality
    
    def test_character_attributes(self):
        """Test that a Character has all expected attributes."""
        character = Character(name="Test", personality="Professional")
        
        # Check that all expected attributes exist
        assert hasattr(character, 'name')
        assert hasattr(character, 'personality')
    
    def test_character_str_representation(self):
        """Test the string representation of a Character."""
        name = "Test Character"
        personality = "Friendly"
        character = Character(name=name, personality=personality)
        
        # Check that __str__ includes the name
        assert name in str(character)
    
    def test_default_values(self):
        """Test that default values are applied if not provided."""
        # Create with minimal arguments, assuming defaults exist
        character = Character()
        
        # Name and personality should have default values
        assert character.name is not None
        assert character.personality is not None 