from supabase import create_client
from typing import List, Dict, Any, Optional
import json
import time
import traceback
import datetime
import logging

class ChatHistoryService:
    def __init__(self, supabase_url, supabase_key):
        """Initialize chat history service with Supabase connection"""
        self.supabase = create_client(supabase_url, supabase_key)
        self.table_name = 'interview_logs'
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    
    def save_chat_history(self, thread_id: str, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None) -> bool:
        """Save or update chat history
        
        Args:
            thread_id: Session ID
            user_email: User email
            messages: List of messages
            config_name: Configuration name
            config_id: Configuration ID
            
        Returns:
            bool: Whether the operation was successful
        """
        try:
            self.logger.info(f"Saving chat history for thread_id: {thread_id}")
            
            # Check if the message list only contains one AI message (welcome message)
            if len(messages) == 1 and messages[0].get('sender') == 'ai':
                self.logger.info(f"Skip saving chat history with only welcome message for thread_id: {thread_id}")
                return True
                
            # Check existing record's message count to avoid overwriting with fewer messages
            try:
                existing = self.supabase.table(self.table_name).select('id,log').eq('thread_id', thread_id).execute()
                
                if existing.data and len(existing.data) > 0:
                    existing_log = existing.data[0].get('log')
                    if existing_log:
                        # Ensure we have parsed JSON
                        if isinstance(existing_log, str):
                            existing_log = json.loads(existing_log)
                            
                        # If existing record has more messages than new messages, skip update
                        if len(existing_log) > len(messages):
                            self.logger.info(f"Existing log has more messages ({len(existing_log)}) than new log ({len(messages)}), skipping update")
                            return True
            except Exception as e:
                self.logger.warning(f"Error checking existing log message count: {e}")
            
            # Check if record exists
            existing = self.supabase.table(self.table_name).select('id').eq('thread_id', thread_id).execute()
            current_time = datetime.datetime.now().isoformat()
            
            # Prepare message data
            messages_json = json.dumps(messages)
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                update_data = {
                    'log': messages_json,
                    'updated_at': current_time
                }
                
                if config_id:
                    update_data['config_id'] = config_id
                
                self.supabase.table(self.table_name).update(update_data).eq('thread_id', thread_id).execute()
                self.logger.info(f"Updated chat history for thread_id {thread_id}")
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
                
                self.supabase.table(self.table_name).insert(insert_data).execute()
                self.logger.info(f"Created new chat history for thread_id {thread_id}")
                
            return True
        except Exception as e:
            self.logger.error(f"Error saving chat history: {e}", exc_info=True)
            return False
    
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