from supabase import create_client
from typing import List, Dict, Any, Optional
import json
import time
import traceback
import datetime
import logging
from openai import OpenAI
from pydantic import BaseModel
from services.elo_calculator import SupabaseEloService as EloCalculator

class ChatHistoryService:
    def __init__(self, supabase_url, supabase_key):
        """Initialize chat history service with Supabase connection"""
        self.supabase = create_client(supabase_url, supabase_key)
        self.table_name = 'interview_logs'
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def save_chat_history(self, thread_id: str, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None) -> Dict[str, Any]:
        """Save or update chat history with separated text and audio metadata
        
        Args:
            thread_id: Unique session identifier
            user_email: User's email address
            messages: List of chat messages
            config_name: Interview configuration name
            config_id: Interview configuration ID
            
        Returns:
            Dictionary with:
            - success: Boolean status
            - interview_id: ID of created/updated record
            - error: Error message if failed
        """
        try:
            self.logger.info(f"Saving chat history for thread_id: {thread_id}")
            
            # Skip saving if only contains welcome message
            if len(messages) == 1 and messages[0].get('sender') == 'ai':
                self.logger.info("Skipping save - only welcome message")
                return {"success": True, "skipped": True}
                
            # Check existing record to prevent overwriting longer histories
            interview_id = None
            existing_message_count = 0
            
            try:
                existing = self.supabase.table(self.table_name) \
                    .select('id,log,audio_metadata') \
                    .eq('thread_id', thread_id) \
                    .execute()
                    
                if existing.data and len(existing.data) > 0:
                    existing_record = existing.data[0]
                    interview_id = existing_record.get('id')
                    
                    # Check message count in existing log
                    existing_log = existing_record.get('log')
                    if existing_log:
                        if isinstance(existing_log, str):
                            existing_log = json.loads(existing_log)
                        existing_message_count = len(existing_log)
                        
                        # Skip update if existing has more messages
                        if existing_message_count > len(messages):
                            self.logger.info(
                                f"Skipping update - existing has {existing_message_count} messages, "
                                f"new has {len(messages)}"
                            )
                            return {
                                "success": True, 
                                "skipped": True, 
                                "interview_id": interview_id
                            }
            except Exception as e:
                self.logger.warning(f"Error checking existing log: {e}")
            
            # Process data for storage
            text_messages = []
            audio_metadata = []
            
            for idx, msg in enumerate(messages):
                # Store "text" and "sender" in log
                text_messages.append({
                    "text": msg.get('text', ''),
                    "sender": msg.get('sender')
                })
                
                # Store "audioUrl" and "storagePath" in audio metadata
                if msg.get('audioUrl') or msg.get('storagePath'):
                    audio_metadata.append({
                        "audioUrl": msg.get('audioUrl'),
                        "storagePath": msg.get('storagePath')
                    })
            
            current_time = datetime.datetime.now().isoformat()
            
            # Prepare data for insert/update
            data = {
                'thread_id': thread_id,
                'email': user_email,
                'config_name': config_name,
                'log': json.dumps(text_messages),
                'updated_at': current_time,
                'audio_metadata': json.dumps(audio_metadata) if audio_metadata else None
            }
            
            if config_id:
                data['config_id'] = config_id
                
            # Update existing or create new record
            if interview_id:
                self.supabase.table(self.table_name) \
                    .update(data) \
                    .eq('id', interview_id) \
                    .execute()
                self.logger.info(f"Updated chat history for {thread_id}")
            else:
                data['created_at'] = current_time
                result = self.supabase.table(self.table_name) \
                    .insert(data) \
                    .execute()
                if result.data:
                    interview_id = result.data[0].get('id')
                self.logger.info(f"Created new chat history for {thread_id}")
            
            return {"success": True, "interview_id": interview_id}
            
        except Exception as e:
            self.logger.error(f"Error saving chat history: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

    
    def get_chat_history(self, thread_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get chat history for a specific session
        
        Args:
            thread_id: Session ID
            
        Returns:
            Optional[List[Dict[str, Any]]]: List of messages or None if not found
        """
        try:
            self.logger.info(f"Retrieving chat history for thread_id: {thread_id}")
            result = self.supabase.table(self.table_name).select('log').eq('thread_id', thread_id).execute()
            
            if not result.data or len(result.data) == 0:
                self.logger.info(f"No chat history found for thread_id {thread_id}")
                return None
                
            log_data = result.data[0].get('log')
            if not log_data:
                self.logger.info(f"Empty log for thread_id {thread_id}")
                return []
                
            if isinstance(log_data, str):
                log_data = json.loads(log_data)
                
            self.logger.info(f"Retrieved {len(log_data)} messages for thread_id {thread_id}")
            return log_data
            
        except Exception as e:
            self.logger.error(f"Error retrieving chat history: {e}", exc_info=True)
            return None
    
    def delete_chat_history(self, thread_id: str) -> bool:
        """Delete chat history for a specific session
        
        Args:
            thread_id: Session ID
            
        Returns:
            bool: Whether the operation was successful
        """
        try:
            self.logger.info(f"Deleting chat history for thread_id: {thread_id}")
            self.supabase.table(self.table_name).delete().eq('thread_id', thread_id).execute()
            self.logger.info(f"Successfully deleted chat history for thread_id {thread_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error deleting chat history: {e}", exc_info=True)
            return False 
        
        
    def save_analysis(self, interview_id: int, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None, session_id: str = "Test") -> Dict[str, Any]:
        """
        Analyze interview conversation and save performance metrics
        
        Args:
            interview_id: Interview ID
            user_email: User email
            messages: List of messages
            config_name: Configuration name
            config_id: Configuration ID
            
        Returns:
            Dict[str, Any]: Result with success status
        """
        try:
            client = OpenAI()
            # Skip analysis if there are too few messages
            if len(messages) < 3:  # Need at least welcome message, user response, and interviewer follow-up
                self.logger.info(f"Skip analysis - too few messages for interview_id: {interview_id}")
                return {"success": True, "skipped": True}
            
            # Extract the conversation for analysis
            conversation = []
            for msg in messages:
                role = "assistant" if msg.get('sender') == 'ai' else "user"
                conversation.append({
                    "role": role,
                    "content": msg.get('text', '')
                })


            
            # Prepare the analysis prompt with very specific output format requirements
            analysis_prompt = [
                {"role": "system", "content": """
                You are an expert interview analyzer. Analyze the following interview conversation and provide scores 
                in these exact categories:
                
                1. technical: Technical knowledge demonstrated (0.0-1.0)
                2. communication: How well the candidate communicates (0.0-1.0)
                3. confidence: How confident the candidate appears (0.0-1.0)
                4. problem_solving: Problem-solving abilities (0.0-1.0)
                5. resume_strength: How well they discuss their experience (0.0-1.0)
                6. leadership: Leadership qualities demonstrated (0.0-1.0)
                
                Do not include any additional keys or explanations in your response.
                """},
                {"role": "user", "content": f"Interview type: {config_name}\n\nConversation:\n{json.dumps(conversation, indent=2)}"}

            ]

            response = client.beta.chat.completions.parse(
                model="gpt-4.5-preview",
                response_format=ScoreRubrics,
                messages=analysis_prompt 
            )

            print(response)
            
            # Call OpenAI for analysis
            # max_attempts = 3
            # for attempt in range(max_attempts):
            #     try:
            #         client = OpenAI()
            #         response = client.chat.completions.create(
            #             model="gpt-4o-mini",
            #             response_format=ScoreRubrics,
            #             messages=analysis_prompt
            #         )
                    
            #         # Parse the analysis results
            #         analysis = response.choices[0].message.parsed
                    
                    # Validate the response format
                    # required_keys = ["technical", "communication", "confidence", "problem_solving", "resume_strength", "leadership"]
                    # if all(key in analysis for key in required_keys) and all(isinstance(analysis[key], (int, float)) for key in required_keys):
                    #     # Format is correct, proceed with saving
                    #     break
                    # else:
                    #     missing_keys = [key for key in required_keys if key not in analysis]
                    #     invalid_types = [key for key in required_keys if key in analysis and not isinstance(analysis[key], (int, float))]
                        
                    #     if missing_keys:
                    #         self.logger.warning(f"Analysis response missing keys: {missing_keys}. Retrying...")
                    #     if invalid_types:
                    #         self.logger.warning(f"Analysis response has invalid types for keys: {invalid_types}. Retrying...")
                        
                    #     if attempt == max_attempts - 1:
                    #         # Last attempt, use default values for missing/invalid keys
                    #         for key in required_keys:
                    #             if key not in analysis or not isinstance(analysis[key], (int, float)):
                    #                 analysis[key] = 0.75  # Default value

                # except Exception as e:
                #     self.logger.error(f"Error in analysis attempt {attempt+1}: {str(e)}")
                #     if attempt == max_attempts - 1:
                #         # Last attempt failed, use default values
                #         analysis = {
                #             "technical": 0.75,
                #             "communication": 0.75,
                #             "confidence": 0.75,
                #             "problem_solving": 0.75,
                #             "resume_strength": 0.75,
                #             "leadership": 0.75
                #         }
            
            # Strengths prompt - get a list of strengths
            strengths_prompt = [
                {"role": "system", "content": """
                You are an expert interview analyzer with years of experience in talent acquisition and candidate assessment. 
                Carefully analyze the following interview conversation and provide 3-5 key strengths demonstrated by the candidate.
                
                Consider the following aspects in your analysis:
                - Communication skills (clarity, conciseness, articulation)
                - Technical knowledge and expertise
                - Problem-solving approach and methodology
                - Leadership qualities and teamwork examples
                - Adaptability and learning mindset
                - Specific accomplishments that demonstrate skills
                
                Be specific and detailed in identifying strengths, looking for concrete examples from the conversation.
                
                Format your response as a JSON array of strings, like this:
                
                ["Excellent communication skills with clear articulation of complex concepts", 
                "Strong technical knowledge in database optimization and system architecture", 
                "Clear problem-solving approach with methodical debugging techniques"]
                
                Your response must be ONLY a valid JSON array of strings, with no additional text or explanation.
                """},
                {"role": "user", "content": f"Interview type: {config_name}\n\nConversation:\n{json.dumps(conversation, indent=2)}"}
            ]
            try:
                strengths_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=strengths_prompt
                )
                strengths_text = strengths_response.choices[0].message.content
                strengths_data = json.loads(strengths_text)
                
                # Ensure we have a valid array
                if not isinstance(strengths_data, list):
                    if isinstance(strengths_data, dict) and "strengths" in strengths_data:
                        strengths_data = strengths_data["strengths"]
                    else:
                        strengths_data = ["Good communication skills", "Demonstrated technical knowledge"]
            except Exception as e:
                self.logger.error(f"Error getting strengths: {str(e)}")
                strengths_data = ["Good communication skills", "Demonstrated technical knowledge"]

            # Weaknesses prompt - get a list of areas for improvement
            weaknesses_prompt = [
                {"role": "system", "content": """
                You are an expert interview analyzer with years of experience in talent acquisition and candidate assessment. 
                Carefully analyze the following interview conversation and provide 3-5 key areas for improvement demonstrated by the candidate.
                
                Consider the following aspects in your analysis:
                - Communication skills (clarity, conciseness, articulation)
                - Technical knowledge and expertise
                - Problem-solving approach and methodology
                - Leadership qualities and teamwork examples
                - Adaptability and learning mindset
                - Specific accomplishments that demonstrate skills
                 
                Be specific and detailed in identifying areas for improvement, looking for concrete examples from the conversation.
                
                Format your response as a JSON array of strings, like this:
                
                ["Could provide more specific examples", "Should elaborate more on technical details", "Consider using the STAR method more consistently"]
                
                Your response must be ONLY a valid JSON array of strings, with no additional text or explanation.
                """},
                {"role": "user", "content": f"Interview type: {config_name}\n\nConversation:\n{json.dumps(conversation, indent=2)}"}
            ]

            try:
                weaknesses_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=weaknesses_prompt
                )
                weaknesses_text = weaknesses_response.choices[0].message.content
                weaknesses_data = json.loads(weaknesses_text)
                
                # Ensure we have a valid array
                if not isinstance(weaknesses_data, list):
                    if isinstance(weaknesses_data, dict) and "areas_for_improvement" in weaknesses_data:
                        weaknesses_data = weaknesses_data["areas_for_improvement"]
                    else:
                        weaknesses_data = ["Could provide more specific examples", "Should structure responses more clearly"]
            except Exception as e:
                self.logger.error(f"Error getting areas for improvement: {str(e)}")
                weaknesses_data = ["Could provide more specific examples", "Should structure responses more clearly"]

            # Specific feedback prompt - get a concise overall assessment
            specific_feedback_prompt = [
                {"role": "system", "content": """
                You are an expert interview analyzer. Analyze the following interview conversation and provide a concise 
                overall assessment of the candidate's performance (minimum 100 characters, maximum 500 characters).
                
                Your response should be a single string with no JSON formatting or additional text.
                """},
                {"role": "user", "content": f"Interview type: {config_name}\n\nConversation:\n{json.dumps(conversation, indent=2)}"}
            ]

            try:
                specific_feedback_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=specific_feedback_prompt
                )
                specific_feedback_text = specific_feedback_response.choices[0].message.content
                
            except Exception as e:
                self.logger.error(f"Error getting specific feedback: {str(e)}")
                specific_feedback_text = "Overall satisfactory performance with room for improvement in specific areas."

            weak_questions_prompt = [
                {
                    "role": "system",
                    "content": (
                        "You are an expert interview analyzer. The conversation below "
                        "is from an interview session. Identify up to three (0–3) questions "
                        "that the candidate responded to weakly or insufficiently. "
                        "Output a valid JSON array of objects with exactly these two keys per object:\n\n"
                        "1) \"question\": The text of the question asked.\n"
                        "Do not include any additional keys or explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Conversation:\n{json.dumps(conversation, indent=2)}"
                    ),
                }
            ]

            try:
                # --- The new prompt for identifying weak questions ---
                weak_questions_response = client.chat.completions.create(
                    model="gpt-4o-mini", 
                    # If you have a custom response format, define it or parse raw JSON
                    messages=weak_questions_prompt
                )
                
                weak_questions_text = weak_questions_response.choices[0].message.content
                weak_questions_data = json.loads(weak_questions_text)
                
                # Validate that weak_questions_data is a list
                if not isinstance(weak_questions_data, list):
                    # If the LLM did not return a JSON list, fallback or handle gracefully:
                    weak_questions_data = []
                    
            except Exception as e:
                self.logger.error(f"Error getting weak questions: {str(e)}")
                # Fallback to empty list if LLM call fails
                weak_questions_data = []

            for item in weak_questions_data:
                question_text = item.get('question', '').strip()
                # Basic validation
                if not question_text:
                    continue  # skip empty

                # Prepare data to insert or update
                upsert_data = {
                    'question_text': question_text,
                    'session_id': session_id,  # whichever session identifier you use
                    'email': user_email,
                    'is_weak': True,
                    'created_at': datetime.datetime.utcnow().isoformat()
                    # If you want a question_type, set it to e.g. 'weak_question'
                    # If you store thread_id or anything else, set them here
                }

                
                # Check if question already exists for this user/session
                existing = self.supabase.table('interview_questions') \
                    .select('*') \
                    .eq('question_text', question_text) \
                    .eq('session_id', upsert_data['session_id']) \
                    .eq('email', user_email) \
                    .execute()
                
                if existing.data and len(existing.data) > 0:
                    # Update existing record
                    existing_id = existing.data[0]['id']
                    self.supabase.table('interview_questions').update({
                        'is_weak': True,
                    }).eq('id', existing_id).execute()
                else:
                    # Insert a new record
                    self.supabase.table('interview_questions').insert(upsert_data).execute()




            print("Analysis:")
            print(response.choices[0].message.parsed)
            print("Strengths:")
            print(strengths_data)
            print("Weaknesses:")
            print(weaknesses_data)
            print("Specific Feedback:")
            print(specific_feedback_text)
            # Store the analysis in the database

            result = self.supabase.table('interview_performance').upsert({
                'interview_id': interview_id,
                'user_email': user_email,
                'technical_accuracy_score': response.choices[0].message.parsed.technical,
                'communication_score': response.choices[0].message.parsed.communication,
                'confidence_score': response.choices[0].message.parsed.confidence,
                'problem_solving_score': response.choices[0].message.parsed.problem_solving,
                'resume_strength_score': response.choices[0].message.parsed.resume_strength,
                'leadership_score': response.choices[0].message.parsed.leadership,
                'strengths': json.dumps(strengths_data),  # Convert to JSON string
                'areas_for_improvement': json.dumps(weaknesses_data),  # Convert to JSON string
                'specific_feedback': specific_feedback_text,
                'created_at': datetime.datetime.now().isoformat()
            }).execute()

            total_score = response.choices[0].message.parsed.technical + response.choices[0].message.parsed.communication + response.choices[0].message.parsed.confidence + response.choices[0].message.parsed.problem_solving + response.choices[0].message.parsed.resume_strength + response.choices[0].message.parsed.leadership
            total_score = total_score / 6

            # Get name from user_email
            name = self.supabase.table('profiles').select('first_name, last_name').eq('email', user_email).execute()
            name = name.data[0].get('first_name') + " " + name.data[0].get('last_name')

            # Update ELO score
            elo_service = EloCalculator()
            print(f"Updating ELO score for {user_email} with score {total_score} and name {name}")
            elo_service.update_elo_score(user_email, total_score, name)


            
            self.logger.info(f"Analysis saved for interview_id: {interview_id}")
            return {"success": True}
            
        except Exception as e:
            self.logger.error(f"Error saving analysis for interview_id {interview_id}: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

class ScoreRubrics(BaseModel):
    technical: float
    communication: float
    confidence: float
    problem_solving: float
    resume_strength: float
    leadership: float

# from __future__ import annotations

# import datetime as _dt
# import json
# import logging
# import traceback
# from typing import Any, Dict, List, Optional

# from openai import OpenAI, OpenAIError  # type: ignore
# from pydantic import BaseModel
# from supabase import Client, create_client
# from supabase.lib.exceptions import SupabaseException

# from services.elo_calculator import SupabaseEloService as EloCalculator


# # ---------------------------------------------------------------------- #
# # Error wrapper
# # ---------------------------------------------------------------------- #
# class ChatHistoryServiceError(Exception):
#     """Raised for any failure inside ChatHistoryService."""

#     def __init__(self, message: str, *, status_code: int = 500, detail: str | None = None):
#         super().__init__(message)
#         self.message = message
#         self.status_code = status_code
#         self.detail = detail


# # ---------------------------------------------------------------------- #
# # Score schema
# # ---------------------------------------------------------------------- #
# class ScoreRubrics(BaseModel):
#     technical: float
#     communication: float
#     confidence: float
#     problem_solving: float
#     resume_strength: float
#     leadership: float


# # ---------------------------------------------------------------------- #
# # Main service
# # ---------------------------------------------------------------------- #
# class ChatHistoryService:
#     """Persist interview chat logs and AI‑driven performance analysis."""

#     TABLE_LOGS = "interview_logs"
#     TABLE_PERF = "interview_performance"
#     TABLE_QUESTIONS = "interview_questions"

#     def __init__(self, supabase_url: str, supabase_key: str) -> None:
#         try:
#             self.supabase: Client = create_client(supabase_url, supabase_key)
#         except Exception as exc:
#             raise ChatHistoryServiceError(
#                 "Cannot connect to chat history database.", detail=str(exc)
#             ) from exc

#         self.logger = logging.getLogger(__name__)
#         if not self.logger.handlers:
#             logging.basicConfig(level=logging.INFO)

#     # ================================================================== #
#     # Log persistence
#     # ================================================================== #
#     def save_chat_history(
#         self,
#         thread_id: str,
#         user_email: str,
#         messages: List[Dict[str, Any]],
#         *,
#         config_name: str = "Interview Session",
#         config_id: Optional[str] = None,
#     ) -> Dict[str, Any]:
#         """
#         Insert or update chat history row.  Returns {"success": True, ...}.
#         Raises ChatHistoryServiceError on system errors; returns {"success": False}
#         only when the service purposely chooses to swallow an issue.
#         """
#         try:
#             self.logger.info("Saving chat history thread=%s (msgs=%d)", thread_id, len(messages))

#             # ── Skip trivial welcome cases ──────────────────────────────
#             if len(messages) == 1 and messages[0].get("sender") == "ai":
#                 return {"success": True, "skipped": True}

#             # ── Find existing row (if any) ──────────────────────────────
#             existing_row = self._first(
#                 self.supabase.table(self.TABLE_LOGS)
#                 .select("id,log")
#                 .eq("thread_id", thread_id)
#                 .execute()
#                 .data
#             )
#             if existing_row:
#                 existing_count = len(json.loads(existing_row["log"])) if existing_row["log"] else 0
#                 if existing_count > len(messages):
#                     return {"success": True, "skipped": True, "interview_id": existing_row["id"]}

#             # ── Build data payload ──────────────────────────────────────
#             text_log = [{"text": m.get("text", ""), "sender": m.get("sender")} for m in messages]
#             audio_meta = [
#                 {"audioUrl": m.get("audioUrl"), "storagePath": m.get("storagePath")}
#                 for m in messages
#                 if m.get("audioUrl") or m.get("storagePath")
#             ]

#             now = _dt.datetime.utcnow().isoformat()
#             record: Dict[str, Any] = {
#                 "thread_id": thread_id,
#                 "email": user_email,
#                 "config_name": config_name,
#                 "log": json.dumps(text_log),
#                 "audio_metadata": json.dumps(audio_meta) if audio_meta else None,
#                 "updated_at": now,
#             }
#             if config_id:
#                 record["config_id"] = config_id

#             # ── Upsert row ──────────────────────────────────────────────
#             if existing_row:
#                 self.supabase.table(self.TABLE_LOGS).update(record).eq("id", existing_row["id"]).execute()
#                 interview_id = existing_row["id"]
#             else:
#                 record["created_at"] = now
#                 insert_r = self.supabase.table(self.TABLE_LOGS).insert(record).execute()
#                 interview_id = self._first(insert_r.data)["id"] if insert_r.data else None

#             return {"success": True, "interview_id": interview_id}
#         except SupabaseException as exc:
#             raise ChatHistoryServiceError(
#                 "Database error while saving chat history.", status_code=502, detail=str(exc)
#             ) from exc
#         except Exception as exc:
#             raise ChatHistoryServiceError(
#                 "Unexpected error while saving chat history.", detail=str(exc)
#             ) from exc

#     def get_chat_history(self, thread_id: str) -> Optional[List[Dict[str, Any]]]:
#         try:
#             row = self._first(
#                 self.supabase.table(self.TABLE_LOGS).select("log").eq("thread_id", thread_id).execute().data
#             )
#             if not row or not row["log"]:
#                 return None
#             return json.loads(row["log"]) if isinstance(row["log"], str) else row["log"]
#         except SupabaseException as exc:
#             raise ChatHistoryServiceError(
#                 "Database error while retrieving chat history.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ChatHistoryServiceError("Unexpected error retrieving chat history.", detail=str(exc)) from exc

#     def delete_chat_history(self, thread_id: str) -> bool:
#         try:
#             self.supabase.table(self.TABLE_LOGS).delete().eq("thread_id", thread_id).execute()
#             return True
#         except SupabaseException as exc:
#             raise ChatHistoryServiceError(
#                 "Database error while deleting chat history.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ChatHistoryServiceError("Unexpected error deleting chat history.", detail=str(exc)) from exc

#     # ================================================================== #
#     # Interview analysis
#     # ================================================================== #
#     def save_analysis(
#         self,
#         interview_id: int,
#         user_email: str,
#         messages: List[Dict[str, Any]],
#         *,
#         config_name: str = "Interview Session",
#         config_id: Optional[str] = None,
#         session_id: str = "N/A",
#     ) -> Dict[str, Any]:
#         """
#         Run GPT‑based analysis, persist results, update ELO.
#         Returns {"success": True} or {"success": False, "error": "..."}.
#         """
#         try:
#             # ── Quick exit for short chats ─────────────────────────────
#             if len(messages) < 3:
#                 return {"success": True, "skipped": True}

#             convo = [
#                 {"role": "assistant" if m.get("sender") == "ai" else "user", "content": m.get("text", "")}
#                 for m in messages
#             ]

#             client = OpenAI()

#             # === SCORING =================================================
#             score_prompt = [
#                 {
#                     "role": "system",
#                     "content": (
#                         "You are an expert interview analyzer. Respond ONLY with the exact JSON "
#                         "object matching the following schema keys and numeric values 0‑1:"
#                         " technical, communication, confidence, problem_solving, resume_strength, leadership."
#                     ),
#                 },
#                 {"role": "user", "content": json.dumps({"type": config_name, "conversation": convo})},
#             ]

#             try:
#                 score_resp = client.beta.chat.completions.parse(
#                     model="gpt-4.5-preview", messages=score_prompt, response_format=ScoreRubrics
#                 )
#                 scores = score_resp.choices[0].message.parsed  # type: ignore[attr-defined]
#             except (OpenAIError, ValueError) as ai_err:
#                 self.logger.error("LLM scoring error: %s", ai_err)
#                 # Fallback with neutral scores
#                 scores = ScoreRubrics(
#                     technical=0.5,
#                     communication=0.5,
#                     confidence=0.5,
#                     problem_solving=0.5,
#                     resume_strength=0.5,
#                     leadership=0.5,
#                 )

#             # === STRENGTHS & WEAKNESSES =================================
#             strengths = self._call_llm_list(
#                 client,
#                 config_name,
#                 convo,
#                 "Provide 3‑5 key strengths demonstrated by the candidate.",
#                 default=["Strong communication", "Good technical foundation"],
#             )
#             weaknesses = self._call_llm_list(
#                 client,
#                 config_name,
#                 convo,
#                 "Provide 3‑5 key areas for improvement.",
#                 default=["Could elaborate with concrete examples", "Needs clearer structure"],
#             )

#             # === SPECIFIC FEEDBACK ======================================
#             feedback_prompt = [
#                 {
#                     "role": "system",
#                     "content": (
#                         "Give a concise overall assessment of the candidate (100‑500 chars). "
#                         "Respond with plain text only."
#                     ),
#                 },
#                 {"role": "user", "content": json.dumps({"type": config_name, "conversation": convo})},
#             ]
#             try:
#                 fb_resp = client.chat.completions.create(model="gpt-4o-mini", messages=feedback_prompt)
#                 specific_feedback = fb_resp.choices[0].message.content  # type: ignore[attr-defined]
#             except OpenAIError as fb_err:
#                 self.logger.error("LLM feedback error: %s", fb_err)
#                 specific_feedback = (
#                     "Overall satisfactory performance with opportunities to deepen technical explanations."
#                 )

#             # === WEAK QUESTIONS =========================================
#             self._persist_weak_questions(client, convo, user_email, session_id)

#             # === STORE RESULTS ==========================================
#             self.supabase.table(self.TABLE_PERF).upsert(
#                 {
#                     "interview_id": interview_id,
#                     "user_email": user_email,
#                     "technical_accuracy_score": scores.technical,
#                     "communication_score": scores.communication,
#                     "confidence_score": scores.confidence,
#                     "problem_solving_score": scores.problem_solving,
#                     "resume_strength_score": scores.resume_strength,
#                     "leadership_score": scores.leadership,
#                     "strengths": json.dumps(strengths),
#                     "areas_for_improvement": json.dumps(weaknesses),
#                     "specific_feedback": specific_feedback,
#                     "created_at": _dt.datetime.utcnow().isoformat(),
#                 }
#             ).execute()

#             # === ELO UPDATE =============================================
#             avg_score = sum(scores.model_dump().values()) / 6.0
#             name_row = self._first(
#                 self.supabase.table("profiles").select("first_name,last_name").eq("email", user_email).execute().data
#             )
#             full_name = f"{name_row.get('first_name', '')} {name_row.get('last_name', '')}".strip()
#             EloCalculator().update_elo_score(user_email, avg_score, full_name)

#             return {"success": True}
#         except SupabaseException as exc:
#             self.logger.error("DB error during analysis: %s", exc, exc_info=True)
#             raise ChatHistoryServiceError(
#                 "Database error while saving analysis.", status_code=502, detail=str(exc)
#             ) from exc
#         except (OpenAIError, ValueError) as exc:
#             self.logger.error("LLM error during analysis: %s", exc, exc_info=True)
#             return {"success": False, "error": "LLM processing failed"}
#         except Exception as exc:
#             self.logger.error(
#                 "Unexpected error saving analysis: %s\n%s", exc, traceback.format_exc(), exc_info=True
#             )
#             raise ChatHistoryServiceError("Unexpected error saving analysis.", detail=str(exc)) from exc

#     # ================================================================== #
#     # Internal helpers
#     # ================================================================== #
#     @staticmethod
#     def _first(rows: List[Dict[str, Any]] | None) -> Optional[Dict[str, Any]]:
#         return rows[0] if rows else None

#     def _call_llm_list(
#         self,
#         client: OpenAI,
#         config_name: str,
#         convo: List[Dict[str, str]],
#         system_instruction: str,
#         *,
#         default: List[str],
#     ) -> List[str]:
#         prompt = [
#             {"role": "system", "content": system_instruction},
#             {"role": "user", "content": json.dumps({"type": config_name, "conversation": convo})},
#         ]
#         try:
#             rsp = client.chat.completions.create(
#                 model="gpt-4o-mini", messages=prompt, response_format={"type": "json_object"}
#             )
#             data = json.loads(rsp.choices[0].message.content)  # type: ignore[attr-defined]
#             if isinstance(data, list):
#                 return data
#             if isinstance(data, dict):
#                 # Gracefully degrade if model nested the list in a key
#                 return next((v for v in data.values() if isinstance(v, list)), default)
#             return default
#         except (OpenAIError, ValueError) as err:
#             self.logger.error("LLM list extraction error: %s", err)
#             return default

#     def _persist_weak_questions(
#         self,
#         client: OpenAI,
#         convo: List[Dict[str, str]],
#         user_email: str,
#         session_id: str,
#     ) -> None:
#         weak_q_prompt = [
#             {
#                 "role": "system",
#                 "content": (
#                     "Identify up to three questions the candidate answered weakly. "
#                     "Return ONLY a JSON array of objects with key 'question'."
#                 ),
#             },
#             {"role": "user", "content": json.dumps({"conversation": convo})},
#         ]
#         try:
#             rsp = client.chat.completions.create(model="gpt-4o-mini", messages=weak_q_prompt)
#             weak_q_data = json.loads(rsp.choices[0].message.content)  # type: ignore[attr-defined]
#             if not isinstance(weak_q_data, list):
#                 return

#             for item in weak_q_data:
#                 q_text = (item.get("question") or "").strip()
#                 if not q_text:
#                     continue

#                 exists = self.supabase.table(self.TABLE_QUESTIONS) \
#                     .select("id") \
#                     .eq("question_text", q_text) \
#                     .eq("session_id", session_id) \
#                     .eq("email", user_email) \
#                     .execute()

#                 if exists.data:
#                     self.supabase.table(self.TABLE_QUESTIONS).update({"is_weak": True}).eq(
#                         "id", exists.data[0]["id"]
#                     ).execute()
#                 else:
#                     self.supabase.table(self.TABLE_QUESTIONS).insert(
#                         {
#                             "question_text": q_text,
#                             "session_id": session_id,
#                             "email": user_email,
#                             "is_weak": True,
#                             "created_at": _dt.datetime.utcnow().isoformat(),
#                         }
#                     ).execute()
#         except (OpenAIError, ValueError, SupabaseException) as err:
#             self.logger.warning("Unable to persist weak questions: %s", err)

