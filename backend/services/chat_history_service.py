from supabase import create_client
from typing import List, Dict, Any, Optional
import json
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
        
        
    def save_analysis(self, interview_id: int, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None) -> Dict[str, Any]:
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

            print("Analysis:")
            print(response.choices[0].message.parsed)
            print("Strengths:")
            print(strengths_data)
            print("Weaknesses:")
            print(weaknesses_data)
            print("Specific Feedback:")
            print(specific_feedback_text)

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


