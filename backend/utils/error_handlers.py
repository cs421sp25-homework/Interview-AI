# Handle errors in the backend, to be elaborated in later iterations
from flask import jsonify

def handle_bad_request(error):
    return jsonify({"error": "Bad request", "message": str(error)}), 400