#!/usr/bin/env python3
"""
ELO Rating Calculator for Interview Performance with Supabase Integration

This script calculates ELO score changes based on interview performance and
stores the results in Supabase.
"""

import os
import argparse
import datetime
from typing import Dict, List, Literal, Optional, Union
import dotenv
from supabase import create_client, Client

# Load environment variables
dotenv.load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

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


class SupabaseEloService:
    """Service for calculating and managing ELO scores using Supabase."""
    
    def __init__(self):
        """Initialize the ELO service with Supabase connection."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Supabase URL and API key must be set in environment variables")
        
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Create elo_history table if it doesn't exist
        self._ensure_elo_history_table()
    
    def _ensure_elo_history_table(self):
        """Ensure the elo_history table exists in Supabase."""
        # This is usually handled through migrations or Supabase UI
        # For this script, we'll assume the table is created manually or through another process
        pass
    
    def get_user_elo(self, email: str) -> int:
        """Get a user's current ELO score.
        
        Args:
            email: The email of the user
            
        Returns:
            The user's current ELO score or the base score if user not found
        """
        response = self.supabase.table("elo_scores").select("eloscore").eq("email", email).execute()
        print(f"Response: {response}")

        if response.data and len(response.data) > 0:
            return response.data[0]["eloscore"]
        
        print(f"User {email} not found in elo_scores table")
        
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
        email: str, 
        interview_score: int, 
        name: str = "Anonymous User",  # Default name if not provided
        difficulty: Literal["easy", "medium", "hard"] = "medium", 
        interview_type: str = "general"
    ) -> Dict:
        """Update a user's ELO based on their interview performance.
        
        Args:
            email: The email of the user
            interview_score: The score achieved in the interview (0-100)
            name: Name of the user (optional, defaults to 'Anonymous User')
            difficulty: The difficulty level of the interview
            interview_type: The type of interview (e.g., "technical", "behavioral")
            
        Returns:
            A dictionary with the old ELO, new ELO, and ELO change
        """
        # Get current ELO or use base ELO if user doesn't exist
        current_elo = self.get_user_elo(email)
        
        # Calculate the new ELO
        print(f"Current ELO: {current_elo}")
        new_elo = self.calculate_elo(current_elo, interview_score, difficulty)
        elo_change = new_elo - current_elo
        print(f"New ELO: {new_elo}")
        timestamp = datetime.datetime.now()
        
        # First try to update the user if they exist
        user_response = self.supabase.table("elo_scores").select("id").eq("email", email).execute()
        print(f"User Response: {user_response}")

        if not user_response.data or len(user_response.data) == 0:
            # User doesn't exist, let's create one
            print(f"User {email} doesn't exist, creating new user")
            # Get the next available ID     
            max_id_response = self.supabase.table("elo_scores").select("id").order("id", desc=True).limit(1).execute()
            next_id = 1
            if max_id_response.data and len(max_id_response.data) > 0:
                next_id = max_id_response.data[0]["id"] + 1
            
            # Determine initial rank for new user
            rank_response = self.supabase.table("elo_scores").select("id").gte("eloscore", new_elo).execute()
            rank = len(rank_response.data) + 1
            
            # Create new user record
            try:
                self.supabase.table("elo_scores").insert({
                    "id": next_id,
                    "name": name,
                    "email": email,
                    "eloscore": new_elo,
                    "rank": rank,
                }).execute()

                self.supabase.table("elo_history").insert({
                    "name": name,
                    "email": email,
                    "eloscore": new_elo,
                    "created_at": timestamp.isoformat()
                }).execute()
                
                print(f"Created new user: {email} with ELO score {new_elo}")
            
            except Exception as e:
                print(f"Error creating user {email}: {e}")
                # If creation fails, still return the calculated values
                return {
                    "old_elo": current_elo,
                    "new_elo": new_elo,
                    "elo_change": elo_change,
                    "timestamp": timestamp.isoformat(),
                    "error": f"Failed to create user: {str(e)}"
                }
        else:
            # User exists, update their ELO score
            user_id = user_response.data[0]["id"]
            
            print(f"User ID: {user_id}")
            print(f"New ELO: {new_elo}")
            print(f"Current ELO: {current_elo}")

            try:
                # Update the user's ELO in the database
                self.supabase.table("elo_scores").update({
                    "eloscore": new_elo,
                }).eq("id", user_id).execute()

                print(f"Updated ELO score for user {email} to {new_elo}")

                self.supabase.table("elo_history").insert({
                    "name": name,
                    "email": email,
                    "eloscore": new_elo,
                    "created_at": timestamp.isoformat()
                }).execute()

                print(f"Inserted ELO history for user {email}")
                
                # Update all ranks
                self._update_all_ranks()
            
            except Exception as e:
                print(f"Error updating user {email}: {e}")
                return {
                    "old_elo": current_elo,
                    "new_elo": new_elo,
                    "elo_change": elo_change,
                    "timestamp": timestamp.isoformat(),
                    "error": f"Failed to update user: {str(e)}"
                }
        
        # Record the ELO history
        try:
            self._record_elo_history(email, current_elo, new_elo, elo_change, interview_score, interview_type, difficulty)
        except Exception as e:
            print(f"Error recording history for {email}: {e}")
        
        return {
            "old_elo": current_elo,
            "new_elo": new_elo,
            "elo_change": elo_change,
            "timestamp": timestamp.isoformat()
        }
    
    def _record_elo_history(
        self,
        email: str,
        old_elo: int,
        new_elo: int,
        change: int,
        interview_score: int,
        interview_type: str,
        difficulty: str
    ):
        """Record an entry in the ELO history table.
        
        Args:
            email: User's email
            old_elo: Previous ELO score
            new_elo: New ELO score
            change: ELO change amount
            interview_score: Score from the interview
            interview_type: Type of interview
            difficulty: Difficulty level of the interview
        """
        try:
            self.supabase.table("elo_history").insert({
                "name": "Anonymous User",
                "email": email,
                "eloscore": new_elo,
                "created_at": datetime.datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error recording ELO history: {e}")
            # Continue execution even if history recording fails
    
    def _update_all_ranks(self):
        """Update the ranks of all users based on their ELO scores."""
        # Get all users ordered by ELO
        users_response = self.supabase.table("elo_scores").select("id, eloscore").order("eloscore", desc=True).execute()
        
        if not users_response.data:
            return
        
        # Update each user's rank
        for rank, user in enumerate(users_response.data, 1):
            self.supabase.table("elo_scores").update({
                "rank": rank
            }).eq("id", user["id"]).execute()
    
    def get_leaderboard(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get the ELO ranking leaderboard.
        
        Args:
            limit: The maximum number of users to return
            offset: The number of users to skip
            
        Returns:
            A list of users sorted by ELO score
        """
        response = self.supabase.table("elo_scores") \
            .select("id, name, email, eloscore, rank") \
            .order("rank") \
            .range(offset, offset + limit - 1) \
            .execute()
        
        return response.data if response.data else []
    
    def get_user_elo_history(self, email: str, limit: int = 90) -> List[Dict]:
        """Get a specific user's ELO history over time.
        
        Args:
            email: The email of the user
            limit: The maximum number of history entries to return
            
        Returns:
            A list of ELO history entries for the user
        """
        response = self.supabase.table("elo_history") \
            .select("eloscore, created_at") \
            .eq("email", email) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        
        print(f"Limit: {limit}")
        
        print(f"Response: {response}")

        if not response.data:
            return []
        
        # Format for frontend charts
        formatted_history = [
            {
                "date": entry["created_at"].split("T")[0],
                "score": entry["eloscore"]
            }
            for entry in response.data
        ]
        
        return formatted_history


def main() -> None:
    """Main function for CLI interaction."""
    parser = argparse.ArgumentParser(description="ELO Score Calculator for Interview Performance")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Update ELO command
    update_parser = subparsers.add_parser("update", help="Update a user's ELO score")
    update_parser.add_argument("--email", required=True, help="User email")
    update_parser.add_argument("--name", required=True, help="User name")
    update_parser.add_argument("--score", type=int, required=True, help="Interview score (0-100)")
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
    get_parser.add_argument("--email", required=True, help="User email")
    
    # Get leaderboard command
    leaderboard_parser = subparsers.add_parser("leaderboard", help="Get the ELO leaderboard")
    leaderboard_parser.add_argument("--limit", type=int, default=10, help="Maximum number of users")
    leaderboard_parser.add_argument("--offset", type=int, default=0, help="Number of users to skip")
    
    # Get user history command
    history_parser = subparsers.add_parser("history", help="Get a user's ELO history")
    history_parser.add_argument("--email", required=True, help="User email")
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
    
    try:
        elo_service = SupabaseEloService()
        
        if args.command == "update":
            result = elo_service.update_elo_score(
                args.email,
                args.score,
                args.name,
                args.difficulty,
                args.type
            )
            print(f"Updated ELO for user {args.email}:")
            print(f"  Old ELO: {result['old_elo']}")
            print(f"  New ELO: {result['new_elo']}")
            print(f"  Change:  {result['elo_change']:+}")
        
        elif args.command == "get":
            elo = elo_service.get_user_elo(args.email)
            print(f"Current ELO for user {args.email}: {elo}")
        
        elif args.command == "leaderboard":
            leaderboard = elo_service.get_leaderboard(args.limit, args.offset)
            print(f"ELO Leaderboard (Rank {args.offset+1}-{args.offset+len(leaderboard)}):")
            for user in leaderboard:
                print(f"  #{user['rank']}: {user['name']} - {user['eloScore']}")
        
        elif args.command == "history":
            history = elo_service.get_user_elo_history(args.email, args.limit)
            print(f"ELO History for user {args.email} (last {len(history)} entries):")
            for entry in history:
                print(f"  {entry['date']}: {entry['score']}")
        
        elif args.command == "calculate":
            new_elo = elo_service.calculate_elo(args.current_elo, args.score, args.difficulty)
            change = new_elo - args.current_elo
            print(f"ELO Calculation Results:")
            print(f"  Current ELO: {args.current_elo}")
            print(f"  New ELO:     {new_elo}")
            print(f"  Change:      {change:+}")
        
        else:
            parser.print_help()
            
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main() 