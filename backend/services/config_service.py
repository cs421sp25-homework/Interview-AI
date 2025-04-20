from supabase import create_client

from models.config_model import Interview

class ConfigService:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)


    def get_single_config(self, name: str, email: str):
         """
         Fetch a config row by matching both name and email.
         Returns:
             dict: The config row if it exists, otherwise None.
         """
         result = (
             self.supabase
             .table("interview_config")
             .select("*")
             .eq("interview_name", name)
             .eq("email", email)
             .execute()
         )
         print(f"get_single_config result: {result.data[0]}")
         if not result.data:
             return None
         return result.data[0]

    def get_configs(self, email: str):
        """
        Retrieves all configuration entries associated with the given email.
        """
        result = self.supabase.table('interview_config').select('*').eq('email', email).execute()
        print(f"get_config result: {result.data}")

        if not result.data:
            return None
        return result.data

    def create_config(self, config_data: dict):
        """
        Create a new config row. Does not update if a config with the same (name, email) already exists.
        """
        try:
            config_data.pop('id', None)
            result = (
                self.supabase
                .table('interview_config')
                .insert(config_data)
                .execute()
            )

            if not result.data:
                return None  # Failed to create

            # Return the newly created row ID
            return result.data[0]['id']
    
        except Exception as e:
            print(f"Error creating config: {e}")
            return None


#TODO might need update and delete operations
    def update_config(self, id: int, updated_data: dict):
        """
        Update an existing config row identified by id.
        """
        result = (
            self.supabase
            .table('interview_config')
            .update(updated_data)
            .eq('id', id)
            .execute()
        )
        if not result.data:
            return None 
        
        return result.data[0]

    def delete_config(self, id: int):
        """
        Delete a config row identified by id.
        """
        result = (
            self.supabase
            .table('interview_config')
            .delete()
            .eq('id', id)
            .execute()
        )
        # Returns True if deletion was successful
        return bool(result.data)

# from __future__ import annotations

# import logging
# from typing import Any, Dict, List, Optional

# from supabase import create_client, Client  # py‑supabase
# from supabase.lib.exceptions import SupabaseException  # ← raised on HTTP 4xx/5xx

# logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)


# class ConfigServiceError(Exception):
#     """
#     Raised when a database operation cannot be completed.

#     Attributes
#     ----------
#     message : str
#         Human‑readable description of the problem (safe to return to the client).
#     status_code : int
#         Suggested HTTP status code (used by Flask error‑handler).
#     detail : str | None
#         Low‑level diagnostic information (NOT returned to end‑users in production).
#     """

#     def __init__(self, message: str, *, status_code: int = 500, detail: str | None = None):
#         super().__init__(message)
#         self.message = message
#         self.status_code = status_code
#         self.detail = detail


# class ConfigService:
#     """
#     Thin wrapper around Supabase queries for the `interview_config` table.
#     Raises `ConfigServiceError` on all failures so callers can handle them uniformly.
#     """

#     def __init__(self, supabase_url: str, supabase_key: str) -> None:
#         try:
#             self.supabase: Client = create_client(supabase_url, supabase_key)
#         except Exception as exc:  # bad URL, bad key, network failure, …
#             raise ConfigServiceError(
#                 "Failed to initialise database client.",
#                 status_code=500,
#                 detail=str(exc),
#             ) from exc

#     # --------------------------------------------------------------------- #
#     # Helpers
#     # --------------------------------------------------------------------- #
#     @staticmethod
#     def _first(rowset: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
#         """Return the first row or `None` if the list is empty."""
#         return rowset[0] if rowset else None

#     # --------------------------------------------------------------------- #
#     # CRUD operations
#     # --------------------------------------------------------------------- #
#     def get_single_config(self, *, name: str, email: str) -> Optional[Dict[str, Any]]:
#         """
#         Return one config that matches both `interview_name` and `email`.

#         Raises
#         ------
#         ConfigServiceError
#             On database/network/permission errors.
#         """
#         try:
#             response = (
#                 self.supabase.table("interview_config")
#                 .select("*")
#                 .eq("interview_name", name)
#                 .eq("email", email)
#                 .limit(1)
#                 .execute()
#             )
#             row = self._first(response.data)
#             logger.info("get_single_config: %s", row)
#             return row
#         except SupabaseException as exc:
#             raise ConfigServiceError(
#                 f"Database error retrieving config “{name}”.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ConfigServiceError(
#                 "Unexpected error retrieving configuration.",
#                 detail=str(exc),
#             ) from exc

#     def get_configs(self, *, email: str) -> List[Dict[str, Any]]:
#         """
#         Return **all** configs for an email.  Returns an empty list if none exist.
#         """
#         try:
#             response = (
#                 self.supabase.table("interview_config")
#                 .select("*")
#                 .eq("email", email)
#                 .execute()
#             )
#             logger.info("get_configs for %s → %d rows", email, len(response.data))
#             return response.data or []
#         except SupabaseException as exc:
#             raise ConfigServiceError(
#                 "Database error retrieving configurations.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ConfigServiceError(
#                 "Unexpected error retrieving configurations.",
#                 detail=str(exc),
#             ) from exc

#     def create_config(self, config: Dict[str, Any]) -> int:
#         """
#         Insert a new row and return its **id**.

#         Raises
#         ------
#         ConfigServiceError
#             If a row with the same `(interview_name, email)` already exists or
#             if the insert fails for any other reason.
#         """
#         payload = dict(config)  # shallow copy
#         payload.pop("id", None)  # never allow the caller to set PK

#         try:
#             response = self.supabase.table("interview_config").insert(payload).execute()
#             row = self._first(response.data)
#             if row is None:
#                 raise ConfigServiceError(
#                     "Insert succeeded but no row returned by the database.",
#                     status_code=500,
#                 )
#             logger.info("create_config: inserted row %s", row["id"])
#             return int(row["id"])
#         except SupabaseException as exc:
#             schema_message = (
#                 "A configuration with the same name already exists."
#                 if exc.code == "23505"  # Postgres unique violation
#                 else "Database rejected the insert operation."
#             )
#             raise ConfigServiceError(
#                 schema_message,
#                 status_code=400 if exc.code == "23505" else 502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ConfigServiceError("Unexpected error creating configuration.", detail=str(exc)) from exc

#     def update_config(self, *, id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
#         """
#         Update fields for row with primary‑key `id` and return the updated row.
#         """
#         if not updates:
#             raise ConfigServiceError("No fields provided for update.", status_code=400)

#         try:
#             response = (
#                 self.supabase.table("interview_config").update(updates).eq("id", id).execute()
#             )
#             row = self._first(response.data)
#             if row is None:
#                 raise ConfigServiceError(
#                     f"Configuration with id={id} not found.", status_code=404
#                 )
#             logger.info("update_config %s with %s", id, updates)
#             return row
#         except SupabaseException as exc:
#             raise ConfigServiceError(
#                 "Database error updating configuration.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ConfigServiceError("Unexpected error updating configuration.", detail=str(exc)) from exc

#     def delete_config(self, *, id: int) -> None:
#         """
#         Delete config row.  A missing row is treated as a user error (404).
#         """
#         try:
#             response = (
#                 self.supabase.table("interview_config").delete().eq("id", id).execute()
#             )
#             if not response.data:
#                 raise ConfigServiceError(
#                     f"Configuration with id={id} not found.", status_code=404
#                 )
#             logger.info("delete_config: removed id=%s", id)
#         except SupabaseException as exc:
#             raise ConfigServiceError(
#                 "Database error deleting configuration.",
#                 status_code=502,
#                 detail=str(exc),
#             ) from exc
#         except Exception as exc:
#             raise ConfigServiceError("Unexpected error deleting configuration.", detail=str(exc)) from exc
