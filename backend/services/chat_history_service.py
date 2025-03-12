from supabase import create_client
from typing import List, Dict, Any, Optional
import json
import time
import traceback
import datetime

class ChatHistoryService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)
        # print("ChatHistoryService initialized with URL:", supabase_url[:10] + "..." if supabase_url else "None")
        # try:
        #     result = self.supabase.table('interview_logs').select('count(*)').limit(1).execute()
        #     print("Successfully connected to interview_logs table")
        # except Exception as e:
        #     print("WARNING: Could not verify interview_logs table existence:", e)
        #     print("Please make sure the interview_logs table is created in your Supabase project")
    
    def save_chat_history(self, thread_id: str, user_email: str, messages: List[Dict[str, Any]], config_name: str = "Interview Session", config_id: str = None) -> bool:
        try:
            # print(f"Attempting to save chat history for thread_id: {thread_id}, email: {user_email}, config_name: {config_name}, config_id: {config_id}")
            # print(f"Message count: {len(messages)}")
            
            existing = self.supabase.table('interview_logs').select('*').eq('thread_id', thread_id).execute()
            
            current_time = datetime.datetime.now().isoformat()
            
            if existing.data and len(existing.data) > 0:
                # print(f"Found existing record for thread_id {thread_id}, updating...")
                update_data = {
                    'log': json.dumps(messages)
                }
                
                if config_id:
                    update_data['config_id'] = config_id
                
                try:
                    update_data['updated_at'] = current_time
                except Exception as e:
                    print(f"Warning: Could not add updated_at field: {e}")
                
                result = self.supabase.table('interview_logs').update(update_data).eq('thread_id', thread_id).execute()
                print(f"Updated chat history for thread_id {thread_id}")
            else:
                print(f"No existing record found for thread_id {thread_id}, creating new record...")
                insert_data = {
                    'thread_id': thread_id,
                    'email': user_email,
                    'config_name': config_name,
                    'log': json.dumps(messages)
                }
                
                if config_id:
                    insert_data['config_id'] = config_id
                
                try:
                    insert_data['created_at'] = current_time
                    insert_data['updated_at'] = current_time
                except Exception as e:
                    print(f"Warning: Could not add timestamp fields: {e}")
                
                result = self.supabase.table('interview_logs').insert(insert_data).execute()
                print(f"Created new chat history for thread_id {thread_id}")
                
            return True
        except Exception as e:
            print(f"Error saving chat history: {e}")
            print(f"Stack trace: {traceback.format_exc()}")
            return False
    
    def get_chat_history(self, thread_id: str) -> Optional[List[Dict[str, Any]]]:
        try:
            print(f"Attempting to get chat history for thread_id: {thread_id}")
            result = self.supabase.table('interview_logs').select('log').eq('thread_id', thread_id).execute()
            
            if result.data and len(result.data) > 0:
                if 'log' in result.data[0] and result.data[0]['log']:
                    log_data = result.data[0]['log']
                    if isinstance(log_data, str):
                        log_data = json.loads(log_data)
                    print(f"Found chat history for thread_id {thread_id}, message count: {len(log_data)}")
                    return log_data
                else:
                    print(f"Log field is empty or missing for thread_id {thread_id}")
                    return []
            
            print(f"No chat history found for thread_id {thread_id}")
            return None
        except Exception as e:
            print(f"Error getting chat history: {e}")
            print(f"Stack trace: {traceback.format_exc()}")
            return None
    
    def delete_chat_history(self, thread_id: str) -> bool:
        try:
            print(f"Attempting to delete chat history for thread_id: {thread_id}")
            result = self.supabase.table('interview_logs').delete().eq('thread_id', thread_id).execute()
            print(f"Deleted chat history for thread_id {thread_id}")
            return True
        except Exception as e:
            print(f"Error deleting chat history: {e}")
            print(f"Stack trace: {traceback.format_exc()}")
            return False 