#!/usr/bin/env python3
"""
ELO Rating Calculator for Interview Performance

This script calculates ELO score changes based on interview performance.
It uses a modified ELO algorithm that treats interviews as "matches" against
a benchmark rating that varies based on interview difficulty.
"""

import json
import os
import argparse
import datetime
from typing import Dict, List, Literal, Optional, Tuple, Union

# Configuration Constants
BASE_ELO = 1200  # Starting ELO for new users
K_FACTOR_DEFAULT = 32  # Standard K-factor
K_FACTOR_HIGH_RATED = 16  # For users with ELO > 1500
K_FACTOR_LOW_RATED = 40  # For users with ELO < 1000

# Benchmark ELO scores by difficulty level
BENCHMARK_ELO = {
    "easy": 1000,
    "medium": 1400,
    "hard": 1800
}

# Performance thresholds - what score is considered a "win", "draw", or "loss"
PERFORMANCE_THRESHOLDS = {
    "win": 75,    # Score >= 75 is a win
    "draw": 50    # 50 <= Score < 75 is a draw, < 50 is a loss
}

# Mock database storage
DB_FILE = "elo_data.json"


class EloService:
    """Service for calculating and managing ELO scores."""
    
    def __init__(self, db_file: str = DB_FILE):
        """Initialize the ELO service.
        
        Args:
            db_file: Path to the JSON file storing ELO data
        """
        self.db_file = db_file
        self._load_data()
    
    def _load_data(self) -> None:
        """Load ELO data from the JSON file or initialize if not exists."""
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "users": {},
                "elo_history": []
            }
    
    def _save_data(self) -> None:
        """Save the current ELO data to the JSON file."""
        with open(self.db_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def get_user_elo(self, user_id: str) -> int:
        """Get a user's current ELO score.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            The user's current ELO score or the base score if user not found
        """
        if user_id in self.data["users"]:
            return self.data["users"][user_id]["elo_score"]
        return BASE_ELO
    
    def get_expected_result(self, user_elo: int, benchmark_elo: int) -> float:
        """Calculate the expected result based on the ELO difference.
        
        This uses the standard ELO formula: 1 / (1 + 10^((ratingB - ratingA) / 400))
        
        Args:
            user_elo: The user's current ELO rating
            benchmark_elo: The benchmark ELO rating (difficulty level)
            
        Returns:
            The expected result value between 0 and 1
        """
        return 1 / (1 + 10 ** ((benchmark_elo - user_elo) / 400))
    
    def calculate_elo(
        self, 
        current_elo: int, 
        interview_score: int, 
        difficulty: Literal["easy", "medium", "hard"] = "medium"
    ) -> int:
        """Calculate the new ELO score based on interview performance.
        
        Args:
            current_elo: The user's current ELO score
            interview_score: The user's interview score (0-100)
            difficulty: The difficulty level of the interview
            
        Returns:
            The new calculated ELO score
        """
        # Get the benchmark ELO based on difficulty
        benchmark_elo = BENCHMARK_ELO[difficulty]
        
        # Determine the K-factor based on the user's current ELO
        k_factor = K_FACTOR_DEFAULT
        if current_elo > 1500:
            k_factor = K_FACTOR_HIGH_RATED
        elif current_elo < 1000:
            k_factor = K_FACTOR_LOW_RATED
        
        # Convert interview score to ELO result (1 = win, 0.5 = draw, 0 = loss)
        if interview_score >= PERFORMANCE_THRESHOLDS["win"]:
            actual_result = 1.0  # Win
        elif interview_score >= PERFORMANCE_THRESHOLDS["draw"]:
            actual_result = 0.5  # Draw
        else:
            actual_result = 0.0  # Loss
        
        # Calculate the expected result using the ELO formula
        expected_result = self.get_expected_result(current_elo, benchmark_elo)
        
        # Calculate the new ELO using the ELO formula
        new_elo = round(current_elo + k_factor * (actual_result - expected_result))
        
        return new_elo
    
    def update_elo_score(
        self, 
        user_id: str, 
        interview_score: int, 
        user_name: Optional[str] = None,
        difficulty: Literal["easy", "medium", "hard"] = "medium", 
        interview_type: str = "general"
    ) -> Dict:
        """Update a user's ELO based on their interview performance.
        
        Args:
            user_id: The ID of the user
            interview_score: The score achieved in the interview (0-100)
            user_name: Name of the user (for new users)
            difficulty: The difficulty level of the interview
            interview_type: The type of interview (e.g., "technical", "behavioral")
            
        Returns:
            A dictionary with the old ELO, new ELO, and ELO change
        """
        # Get or create user
        if user_id not in self.data["users"]:
            self.data["users"][user_id] = {
                "id": user_id,
                "name": user_name or f"User_{user_id}",
                "elo_score": BASE_ELO,
                "created_at": datetime.datetime.now().isoformat()
            }
        
        current_elo = self.data["users"][user_id]["elo_score"]
        
        # Calculate the new ELO
        new_elo = self.calculate_elo(current_elo, interview_score, difficulty)
        elo_change = new_elo - current_elo
        
        # Update the user's ELO in the data
        self.data["users"][user_id]["elo_score"] = new_elo
        self.data["users"][user_id]["updated_at"] = datetime.datetime.now().isoformat()
        
        # Record the ELO history for charts and tracking
        timestamp = datetime.datetime.now().isoformat()
        history_entry = {
            "id": f"hist_{len(self.data['elo_history'])}",
            "user_id": user_id,
            "old_elo": current_elo,
            "new_elo": new_elo,
            "change": elo_change,
            "interview_score": interview_score,
            "interview_type": interview_type,
            "interview_difficulty": difficulty,
            "timestamp": timestamp
        }
        
        self.data["elo_history"].append(history_entry)
        
        # Save data
        self._save_data()
        
        return {
            "old_elo": current_elo,
            "new_elo": new_elo,
            "elo_change": elo_change,
            "timestamp": timestamp
        }
    
    def get_leaderboard(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get the ELO ranking leaderboard.
        
        Args:
            limit: The maximum number of users to return
            offset: The number of users to skip
            
        Returns:
            A list of users sorted by ELO score
        """
        # Convert users dict to list and sort by ELO score
        users = list(self.data["users"].values())
        sorted_users = sorted(users, key=lambda u: u["elo_score"], reverse=True)
        
        # Apply offset and limit
        paginated_users = sorted_users[offset:offset + limit]
        
        # Add rank to each user
        for i, user in enumerate(paginated_users, offset + 1):
            user["rank"] = i
        
        return paginated_users
    
    def get_user_elo_history(self, user_id: str, limit: int = 90) -> List[Dict]:
        """Get a specific user's ELO history over time.
        
        Args:
            user_id: The ID of the user
            limit: The maximum number of history entries to return
            
        Returns:
            A list of ELO history entries for the user
        """
        # Filter history for the user
        user_history = [
            h for h in self.data["elo_history"] 
            if h["user_id"] == user_id
        ]
        
        # Sort by timestamp (newest first) and apply limit
        sorted_history = sorted(
            user_history, 
            key=lambda h: h["timestamp"], 
            reverse=True
        )[:limit]
        
        # Format for frontend charts
        formatted_history = [
            {
                "date": h["timestamp"].split("T")[0],
                "score": h["new_elo"]
            }
            for h in sorted_history
        ]
        
        # Reverse to get chronological order
        return list(reversed(formatted_history))


def main() -> None:
    """Main function for CLI interaction."""
    parser = argparse.ArgumentParser(description="ELO Score Calculator for Interview Performance")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Update ELO command
    update_parser = subparsers.add_parser("update", help="Update a user's ELO score")
    update_parser.add_argument("--user-id", required=True, help="User ID")
    update_parser.add_argument("--score", type=int, required=True, help="Interview score (0-100)")
    update_parser.add_argument("--name", help="User name (for new users)")
    update_parser.add_argument(
        "--difficulty", 
        choices=["easy", "medium", "hard"], 
        default="medium", 
        help="Interview difficulty"
    )
    update_parser.add_argument(
        "--type", 
        default="general", 
        help="Interview type (e.g., technical, behavioral)"
    )
    
    # Get ELO command
    get_parser = subparsers.add_parser("get", help="Get a user's current ELO score")
    get_parser.add_argument("--user-id", required=True, help="User ID")
    
    # Get leaderboard command
    leaderboard_parser = subparsers.add_parser("leaderboard", help="Get the ELO leaderboard")
    leaderboard_parser.add_argument("--limit", type=int, default=10, help="Maximum number of users")
    leaderboard_parser.add_argument("--offset", type=int, default=0, help="Number of users to skip")
    
    # Get user history command
    history_parser = subparsers.add_parser("history", help="Get a user's ELO history")
    history_parser.add_argument("--user-id", required=True, help="User ID")
    history_parser.add_argument("--limit", type=int, default=10, help="Maximum number of entries")
    
    # Calculate ELO command (without storing)
    calc_parser = subparsers.add_parser("calculate", help="Calculate ELO change (without storing)")
    calc_parser.add_argument("--current-elo", type=int, required=True, help="Current ELO score")
    calc_parser.add_argument("--score", type=int, required=True, help="Interview score (0-100)")
    calc_parser.add_argument(
        "--difficulty", 
        choices=["easy", "medium", "hard"], 
        default="medium", 
        help="Interview difficulty"
    )
    
    args = parser.parse_args()
    
    elo_service = EloService()
    
    if args.command == "update":
        result = elo_service.update_elo_score(
            args.user_id,
            args.score,
            args.name,
            args.difficulty,
            args.type
        )
        print(f"Updated ELO for user {args.user_id}:")
        print(f"  Old ELO: {result['old_elo']}")
        print(f"  New ELO: {result['new_elo']}")
        print(f"  Change:  {result['elo_change']:+}")
    
    elif args.command == "get":
        elo = elo_service.get_user_elo(args.user_id)
        print(f"Current ELO for user {args.user_id}: {elo}")
    
    elif args.command == "leaderboard":
        leaderboard = elo_service.get_leaderboard(args.limit, args.offset)
        print(f"ELO Leaderboard (Rank {args.offset+1}-{args.offset+len(leaderboard)}):")
        for user in leaderboard:
            print(f"  #{user['rank']}: {user['name']} - {user['elo_score']}")
    
    elif args.command == "history":
        history = elo_service.get_user_elo_history(args.user_id, args.limit)
        print(f"ELO History for user {args.user_id} (last {len(history)} entries):")
        for entry in history:
            print(f"  {entry['date']}: {entry['score']}")
    
    elif args.command == "calculate":
        elo_service = EloService()
        new_elo = elo_service.calculate_elo(args.current_elo, args.score, args.difficulty)
        change = new_elo - args.current_elo
        print(f"ELO Calculation Results:")
        print(f"  Current ELO: {args.current_elo}")
        print(f"  New ELO:     {new_elo}")
        print(f"  Change:      {change:+}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main() 