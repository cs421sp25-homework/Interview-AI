from supabase import create_client
from typing import List, Dict, Any, Optional
import json
import time
import traceback
import datetime
import logging
from openai import OpenAI

class ChatHistoryService:
    def __init__(self, supabase_url, supabase_key):
        """Initialize chat history service with Supabase connection"""
        self.supabase = create_client(supabase_url, supabase_key)
        self.table_name = 'interview_logs'
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    
    def save_chat_history(self, thread_id: str, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None, company_name: str = None, interview_type: str = None, question_type: str = None) -> Dict[str, Any]:
        """Save or update chat history
        
        Args:
            thread_id: Session ID
            user_email: User email
            messages: List of messages
            config_name: Configuration name
            config_id: Configuration ID
            company_name: Company name
            interview_type: Interview type
            question_type: Question type
            
        Returns:
            Dict[str, Any]: Result with success status and interview ID
        """
        try:
            self.logger.info(f"Saving chat history for thread_id: {thread_id}")
            
            # Check if the message list only contains one AI message (welcome message)
            if len(messages) == 1 and messages[0].get('sender') == 'ai':
                self.logger.info(f"Skip saving chat history with only welcome message for thread_id: {thread_id}")
                return {"success": True, "skipped": True}
                
            # Check existing record's message count to avoid overwriting with fewer messages
            interview_id = None
            try:
                existing = self.supabase.table(self.table_name).select('id,log').eq('thread_id', thread_id).execute()
                
                if existing.data and len(existing.data) > 0:
                    interview_id = existing.data[0].get('id')
                    existing_log = existing.data[0].get('log')
                    if existing_log:
                        # Ensure we have parsed JSON
                        if isinstance(existing_log, str):
                            existing_log = json.loads(existing_log)
                            
                        # If existing record has more messages than new messages, skip update
                        if len(existing_log) > len(messages):
                            self.logger.info(f"Existing log has more messages ({len(existing_log)}) than new log ({len(messages)}), skipping update")
                            return {"success": True, "skipped": True, "interview_id": interview_id}
            except Exception as e:
                self.logger.warning(f"Error checking existing log message count: {e}")
            
            # Check if record exists
            if not interview_id:
                existing = self.supabase.table(self.table_name).select('id').eq('thread_id', thread_id).execute()
                if existing.data and len(existing.data) > 0:
                    interview_id = existing.data[0].get('id')
                
            current_time = datetime.datetime.now().isoformat()
            
            # Prepare message data
            messages_json = json.dumps(messages)
            
            if interview_id:
                # Update existing record
                update_data = {
                    'log': messages_json,
                    'updated_at': current_time
                }
                
                if config_id:
                    update_data['config_id'] = config_id
                if company_name:
                    update_data['company_name'] = company_name
                if interview_type:
                    update_data['interview_type'] = interview_type
                if question_type:
                    update_data['question_type'] = question_type
                
                self.supabase.table(self.table_name).update(update_data).eq('id', interview_id).execute()
                self.logger.info(f"Updated chat history for thread_id {thread_id}, interview_id {interview_id}")
            else:
                # Create new record
                insert_data = {
                    'thread_id': thread_id,
                    'email': user_email,
                    'config_name': config_name,
                    'log': messages_json,
                    'created_at': current_time,
                    'updated_at': current_time
                }
                
                if config_id:
                    insert_data['config_id'] = config_id
                if company_name:
                    insert_data['company_name'] = company_name
                if interview_type:
                    insert_data['interview_type'] = interview_type
                if question_type:
                    insert_data['question_type'] = question_type
                
                result = self.supabase.table(self.table_name).insert(insert_data).execute()
                if result.data and len(result.data) > 0:
                    interview_id = result.data[0].get('id')
                self.logger.info(f"Created new chat history for thread_id {thread_id}, interview_id {interview_id}")
                
            return {"success": True, "interview_id": interview_id}
        except Exception as e:
            self.logger.error(f"Error saving chat history: {e}", exc_info=True)
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
                
                Your response MUST be a JSON object with EXACTLY these keys and numeric values between 0.0 and 1.0.
                Example of the required format:
                {
                    "technical": 0.85,
                    "communication": 0.92,
                    "confidence": 0.78,
                    "problem_solving": 0.88,
                    "resume_strength": 0.75,
                    "leadership": 0.82
                }
                
                Do not include any additional keys or explanations in your response.
                """},
                {"role": "user", "content": f"Interview type: {config_name}\n\nConversation:\n{json.dumps(conversation, indent=2)}"}
            ]
            
            # Call OpenAI for analysis
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    client = OpenAI()
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        response_format={"type": "json_object"},
                        messages=analysis_prompt
                    )
                    
                    # Parse the analysis results
                    analysis_text = response.choices[0].message.content
                    analysis = json.loads(analysis_text)
                    
                    # Validate the response format
                    required_keys = ["technical", "communication", "confidence", "problem_solving", "resume_strength", "leadership"]
                    if all(key in analysis for key in required_keys) and all(isinstance(analysis[key], (int, float)) for key in required_keys):
                        # Format is correct, proceed with saving
                        break
                    else:
                        missing_keys = [key for key in required_keys if key not in analysis]
                        invalid_types = [key for key in required_keys if key in analysis and not isinstance(analysis[key], (int, float))]
                        
                        if missing_keys:
                            self.logger.warning(f"Analysis response missing keys: {missing_keys}. Retrying...")
                        if invalid_types:
                            self.logger.warning(f"Analysis response has invalid types for keys: {invalid_types}. Retrying...")
                        
                        if attempt == max_attempts - 1:
                            # Last attempt, use default values for missing/invalid keys
                            for key in required_keys:
                                if key not in analysis or not isinstance(analysis[key], (int, float)):
                                    analysis[key] = 0.75  # Default value

                except Exception as e:
                    self.logger.error(f"Error in analysis attempt {attempt+1}: {str(e)}")
                    if attempt == max_attempts - 1:
                        # Last attempt failed, use default values
                        analysis = {
                            "technical": 0.75,
                            "communication": 0.75,
                            "confidence": 0.75,
                            "problem_solving": 0.75,
                            "resume_strength": 0.75,
                            "leadership": 0.75
                        }
            
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
                
                # Limit to 200 characters if needed
                if len(specific_feedback_text) > 200:
                    specific_feedback_text = specific_feedback_text[:197] + "..."
            except Exception as e:
                self.logger.error(f"Error getting specific feedback: {str(e)}")
                specific_feedback_text = "Overall satisfactory performance with room for improvement in specific areas."


            print("Analysis:")
            print(analysis)
            print("Strengths:")
            print(strengths_data)
            print("Weaknesses:")
            print(weaknesses_data)
            print("Specific Feedback:")
            print(specific_feedback_text)
            # Store the analysis in the database
            result = self.supabase.table('interview_performance').upsert({
                'interview_id': interview_id,
                'technical_accuracy_score': analysis.get('technical', 0),
                'communication_score': analysis.get('communication', 0),
                'confidence_score': analysis.get('confidence', 0),
                'problem_solving_score': analysis.get('problem_solving', 0),
                'resume_strength_score': analysis.get('resume_strength', 0),
                'leadership_score': analysis.get('leadership', 0),
                'strengths': json.dumps(strengths_data),  # Convert to JSON string
                'areas_for_improvement': json.dumps(weaknesses_data),  # Convert to JSON string
                'specific_feedback': specific_feedback_text,
                'created_at': datetime.datetime.now().isoformat()
            }).execute()
            
            self.logger.info(f"Analysis saved for interview_id: {interview_id}")
            return {"success": True}
            
        except Exception as e:
            self.logger.error(f"Error saving analysis for interview_id {interview_id}: {str(e)}")
            self.logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}