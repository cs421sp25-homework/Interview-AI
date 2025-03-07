#TODO basic tests now, need Timothy to work on more realistic test case and more detail assertions
import unittest
import uuid
import os
from app import app, active_interviews  # Adjust import to match your app's structure
from services.config_service import ConfigService  # If you have a separate file
from unittest.mock import patch

class TestInterviewAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """
        Runs once before any tests in this suite.
        Example: create a config row in your DB or mock it.
        """
        cls.client = app.test_client()
        cls.logfile = "test_interview_log.txt"
        pass

    def tearDown(self):
        """
        Runs after each test, can clear out active_interviews or do any cleanup needed.
        """
        active_interviews.clear()

    def test_single_interview_flow(self):
        """
        1) Mock fetching a config row from DB
        2) Start new_chat -> get greeting + thread_id
        3) Continue with chat calls -> record responses in a log file
        """
        # 1) Start new_chat
        response = self.client.post("/api/new_chat", json={
            "email": "ericeason2003@gmail.com",
            "name": "Strat"
        })
        self.assertEqual(response.status_code, 200, "new_chat should return 200 OK.")
        data = response.get_json()
        self.assertIn("thread_id", data, "Response should have a thread_id.")
        self.assertIn("response", data, "Response should have a greeting.")

        thread_id = data["thread_id"]
        greeting = data["response"]
        self.assertTrue(len(greeting) > 0, "Greeting message should not be empty.")

        # Write to log file
        with open(self.logfile, "a") as f:
            f.write(f"--- New Chat Started ---\n")
            f.write(f"Thread ID: {thread_id}\n")
            f.write(f"AI Greeting: {greeting}\n\n")

        # 2) Next chat call
        user_input = "Hi, I'm excited to interview for this job!"
        response2 = self.client.post("/api/chat", json={
            "thread_id": thread_id,
            "message": user_input
        })
        self.assertEqual(response2.status_code, 200)
        data2 = response2.get_json()
        self.assertIn("response", data2, "Chat call should have 'response' in JSON.")
        next_q = data2["response"]
        ended = data2["ended"]
        self.assertFalse(ended, "Interview should not end on the first question.")
        self.assertTrue(len(next_q) > 0, "Next question from AI should not be empty.")

        # Log the question
        with open(self.logfile, "a") as f:
            f.write(f"User: {user_input}\n")
            f.write(f"AI: {next_q}\n\n")

        # 3) Force the interview to end by repeatedly calling chat until 'ended' is True
        #    or just call next_question 4 times more (since threshold=5).
        for i in range(4):
            user_input = f"Candidate response #{i}"
            res = self.client.post("/api/chat", json={
                "thread_id": thread_id,
                "message": user_input
            })
            self.assertEqual(res.status_code, 200)
            dat = res.get_json()
            ai_resp = dat["response"]
            ended_flag = dat["ended"]

            with open(self.logfile, "a") as f:
                f.write(f"User: {user_input}\n")
                f.write(f"AI: {ai_resp}\n\n")

            if ended_flag:
                break

        self.assertTrue(ended_flag, "Interview should have ended by now (threshold=5).")

    def test_two_simultaneous_interviews(self):
        """
        1) Start two separate interviews by calling /api/new_chat with different config.
        2) Ensure each interview maintains its own memory (distinct thread_id).
        3) Send a chat message to each, verify separate responses.
        """

        # Start interview 1
        resp1 = self.client.post("/api/new_chat", json={
            "email": "ericeason2003@gmail.com",
            "name": "Strat"
        })
        data1 = resp1.get_json()
        thread_id_1 = data1["thread_id"]
        greeting_1 = data1["response"]

        # Start interview 2
        resp2 = self.client.post("/api/new_chat", json={
            "email": "ericeason2003@gmail.com",
            "name": "president"
        })
        data2 = resp2.get_json()
        thread_id_2 = data2["thread_id"]
        greeting_2 = data2["response"]

        self.assertNotEqual(thread_id_1, thread_id_2, "Thread IDs must be distinct.")
        # Chat calls to each thread
        user_message_1 = "Hello, I'm excited to learn more about the Frontend position!"
        chat1 = self.client.post("/api/chat", json={
            "thread_id": thread_id_1,
            "message": user_message_1
        })
        next_q_1 = chat1.get_json()["response"]

        user_message_2 = "Hi! I'm the perfect fit for Data Scientist role."
        chat2 = self.client.post("/api/chat", json={
            "thread_id": thread_id_2,
            "message": user_message_2
        })
        next_q_2 = chat2.get_json()["response"]

        # The memory from interview 1 should not affect interview 2, so we check that
        # they are referencing different roles or different context.
        self.assertNotEqual(next_q_1, next_q_2, "Responses from two different interviews should differ (or reference different roles).")

        # Optional: log them
        with open(self.logfile, "w") as f:
            f.write("=== Interview 1 ===\n")
            f.write(f"Greeting: {greeting_1}\n")
            f.write(f"User: {user_message_1}\n")
            f.write(f"AI: {next_q_1}\n\n")
            f.write("=== Interview 2 ===\n")
            f.write(f"Greeting: {greeting_2}\n")
            f.write(f"User: {user_message_2}\n")
            f.write(f"AI: {next_q_2}\n\n")

        # We won't fully end these interviews, but we've demonstrated distinct memory usage.

if __name__ == "__main__":
    unittest.main()
