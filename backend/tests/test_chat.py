# import pytest
# import requests
# import uuid

# @pytest.fixture
# def base_url():
#     """Base URL for your API."""
#     return "http://127.0.0.1:5001/api"


# # -----------------------------------------------------------------------------------------
# # /api/new_chat
# # -----------------------------------------------------------------------------------------
# @pytest.mark.parametrize("invalid_body", [
#     {},  # No data at all
#     {"email": "user@example.com"},  # Missing name
#     {"name": "ConfigName"},         # Missing email
# ])
# def test_new_chat_missing_params(base_url, invalid_body):
#     """
#     Tests that /api/new_chat returns 400 if required parameters (email, name) are missing.
#     """
#     response = requests.post(f"{base_url}/new_chat", json=invalid_body)
#     assert response.status_code == 400, (
#         f"Expected 400 for invalid request body, got {response.status_code}"
#     )
#     data = response.json()
#     assert "error" in data, "Response should contain 'error' when parameters are missing."


# def test_new_chat_config_not_found(base_url):
#     """
#     Tests that /api/new_chat returns 404 if no config is found for given name and email.
#     This assumes config_service.get_single_config returns None or an empty result.
#     """
#     payload = {
#         "email": "no_config@example.com",
#         "name": "NonExistentConfig"
#     }
#     response = requests.post(f"{base_url}/new_chat", json=payload)
#     assert response.status_code == 404, (
#         f"Expected 404 if config does not exist, got {response.status_code}"
#     )
#     data = response.json()
#     assert "error" in data, "Response should contain 'error' if no config is found."


# def test_new_chat_behavioral_config(base_url):
#     """
#     Tests that /api/new_chat handles a 'behavioral' question_type properly.
#     Assuming config_service.get_single_config returns a mock config with question_type='behavioral'.
#     """
#     payload = {
#         "email": "test_user@example.com",
#         "name": "BehavioralInterviewConfig"
#     }
#     response = requests.post(f"{base_url}/new_chat", json=payload)
#     assert response.status_code == 200, (
#         f"Expected 200 for valid config, got {response.status_code}"
#     )
#     data = response.json()
    
#     # The endpoint returns thread_id and a response (welcome_message).
#     assert "thread_id" in data, "Response should contain 'thread_id'."
#     assert "response" in data, "Response should contain a 'response' (welcome_message)."
#     assert "behavioral interview" in data["response"].lower(), (
#         "Expected a behavioral-specific welcome message."
#     )


# def test_new_chat_technical_config(base_url):
#     """
#     Tests that /api/new_chat handles a 'technical' question_type properly.
#     Assuming config_service.get_single_config returns a mock config with question_type='technical'.
#     """
#     payload = {
#         "email": "test_user@example.com",
#         "name": "TechnicalInterviewConfig"
#     }
#     response = requests.post(f"{base_url}/new_chat", json=payload)
#     assert response.status_code == 200, (
#         f"Expected 200 for valid technical config, got {response.status_code}"
#     )
#     data = response.json()

#     assert "thread_id" in data, "Should contain 'thread_id'."
#     assert "response" in data, "Should contain a 'response' (welcome_message)."
#     assert "technical interview" in data["response"].lower(), (
#         "Expected a technical-specific welcome message."
#     )


# def test_new_chat_default_config(base_url):
#     """
#     Tests that /api/new_chat handles an interview with no recognized question_type (default path).
#     """
#     payload = {
#         "email": "test_user@example.com",
#         "name": "DefaultInterviewConfig"
#     }
#     response = requests.post(f"{base_url}/new_chat", json=payload)
#     assert response.status_code == 200, (
#         f"Expected 200 for valid default config, got {response.status_code}"
#     )
#     data = response.json()
    
#     assert "thread_id" in data, "Should contain 'thread_id'."
#     assert "response" in data, "Should contain a 'response'."
#     # Expect a more generic welcome message in the default path
#     assert "welcome to your interview" in data["response"].lower(), (
#         "Expected a default, generic welcome message for non-behavioral/technical interviews."
#     )


# def test_new_chat_with_profile_resume(base_url):
#     """
#     Tests that /api/new_chat handles userProfile data properly (building resume_text).
#     Here we assume the config still exists and is valid.
#     """
#     payload = {
#         "email": "resumeuser@example.com",
#         "name": "ResumeInterviewConfig",
#         "userProfile": {
#             "first_name": "John",
#             "last_name": "Doe",
#             "job_title": "Senior Developer",
#             "key_skills": ["Python", "Django", "AWS"],
#             "education_history": [
#                 {"institution": "University A", "degree": "BSc. Computer Science", "dates": "2010-2014"}
#             ],
#             "resume_experience": [
#                 {
#                     "company": "TechCorp",
#                     "position": "Software Engineer",
#                     "dates": "2015-2018",
#                     "description": "Developed microservices"
#                 },
#                 {
#                     "company": "DataSystems",
#                     "position": "Data Engineer",
#                     "dates": "2018-2021",
#                     "description": "Built ETL pipelines"
#                 }
#             ]
#         }
#     }
#     response = requests.post(f"{base_url}/new_chat", json=payload)
#     assert response.status_code == 200, (
#         f"Expected 200 for valid request, got {response.status_code}"
#     )
#     data = response.json()
#     assert "thread_id" in data, "Response should contain 'thread_id'."
#     assert "response" in data, "Response should contain a 'response' (welcome_message)."
#     # We can't easily parse the entire resume text here, but we can do a minimal check
#     # to ensure that "John Doe" is included in the agent's resume text behind the scenes
#     # (Though you'd likely mock and confirm in a more controlled test).
    

# # -----------------------------------------------------------------------------------------
# # /api/chat
# # -----------------------------------------------------------------------------------------
# def test_chat_missing_thread_id(base_url):
#     """
#     Tests /api/chat returns 400 if 'thread_id' is missing.
#     """
#     payload = {
#         # 'thread_id': 'missing',  # intentionally omitted
#         "message": "Hello",
#         "email": "test_user@example.com"
#     }
#     response = requests.post(f"{base_url}/chat", json=payload)
#     assert response.status_code == 400, (
#         f"Expected 400 if 'thread_id' is missing, got {response.status_code}"
#     )
#     data = response.json()
#     assert "error" in data, "Response should contain 'error' when thread_id is missing."


# def test_chat_invalid_thread_id(base_url):
#     """
#     Tests /api/chat returns 404 if the thread_id doesn't exist in active_interviews.
#     """
#     payload = {
#         "thread_id": str(uuid.uuid4()),  # A random UUID unlikely to exist
#         "message": "Hello",
#         "email": "test_user@example.com"
#     }
#     response = requests.post(f"{base_url}/chat", json=payload)
#     assert response.status_code == 404, (
#         f"Expected 404 if thread_id is invalid, got {response.status_code}"
#     )
#     data = response.json()
#     assert "error" in data, "Response should contain 'error' when thread_id is invalid."


# def test_chat_interaction(base_url):
#     """
#     Tests a normal chat flow: we first create a new_chat to get a valid thread_id,
#     then post to /api/chat with user messages.
#     This ensures the conversation logic is working.
#     """
#     # 1) Create a new chat
#     new_chat_payload = {
#         "email": "test_user@example.com",
#         "name": "SomeInterviewConfig"
#     }
#     new_chat_resp = requests.post(f"{base_url}/new_chat", json=new_chat_payload)
#     assert new_chat_resp.status_code == 200, (
#         f"Expected 200 creating new chat, got {new_chat_resp.status_code}"
#     )
#     new_chat_data = new_chat_resp.json()
#     thread_id = new_chat_data.get("thread_id")
#     assert thread_id, "new_chat response must contain a thread_id."

#     # 2) Send a user message to /api/chat
#     chat_payload = {
#         "thread_id": thread_id,
#         "message": "I have 5 years of experience in software development.",
#         "email": "test_user@example.com"
#     }
#     chat_resp = requests.post(f"{base_url}/chat", json=chat_payload)
#     assert chat_resp.status_code == 200, (
#         f"Expected 200 from /api/chat, got {chat_resp.status_code}"
#     )
#     chat_data = chat_resp.json()
#     # Typically you'd get a response from the AI
#     assert "response" in chat_data, "Expected 'response' (the AI's question/statement) in chat."
#     assert chat_data.get("ended") in [True, False], "Expected an 'ended' boolean."

#     # 3) If not ended, continue chatting until ended or we want to test the next question
#     if chat_data["ended"] is False:
#         next_chat_payload = {
#             "thread_id": thread_id,
#             "message": "Thanks for asking. I'm also proficient in Docker and Kubernetes.",
#             "email": "test_user@example.com"
#         }
#         next_chat_resp = requests.post(f"{base_url}/chat", json=next_chat_payload)
#         assert next_chat_resp.status_code == 200, (
#             f"Expected 200 from /api/chat on second message, got {next_chat_resp.status_code}"
#         )
#         next_chat_data = next_chat_resp.json()
#         assert "response" in next_chat_data, "Expected 'response' from the agent."
#         assert next_chat_data.get("ended") in [True, False], "Expected an 'ended' boolean."

#     # If you want to test the end of an interview, you might mock `agent.is_end()` 
#     # or call enough messages until ended is True.


# def test_chat_end_interview_flow(base_url):
#     """
#     Tests scenario where the agent decides the interview is ended (ended=True).
#     This requires either mocking or creating conditions so that the agent 
#     returns an end_interview message.
#     """
#     # Typically you'd force the agent to end either by repeated calls or a special user input
#     # For demonstration, we'll assume we have a valid thread_id from a previously created chat
#     thread_id = "someKnownThreadId"  # In real usage, generate or mock it
#     payload = {
#         "thread_id": thread_id,
#         "message": "I've answered all your questions thoroughly, let me know if we are done.",
#         "email": "test_user@example.com"
#     }
#     response = requests.post(f"{base_url}/chat", json=payload)
#     # We can't guarantee the agent has ended unless we've mocked or forced it, 
#     # but let's assume it returns 200
#     assert response.status_code in (200, 404), (
#         f"Expected 200 or 404, got {response.status_code}"
#     )
#     if response.status_code == 200:
#         data = response.json()
#         if data.get("ended"):
#             assert "response" in data, "Expected a wrap-up response when ended."
#             # Possibly check if data["response"] contains some final message content
#         else:
#             # Not ended yet; you'd either fail the test or proceed
#             pass
