from flask import Flask, jsonify
from flask_cors import CORS  # Helps with Cross-Origin Resource Sharing

app = Flask(__name__)
CORS(app)  # Enable CORS so that your React app can talk to this API

@app.route('/api/profile', methods=['GET'])
def profile():
    data = {
        "name": "John Doe",
        "about": "A full stack developer who loves Python and JavaScript"
    }
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
