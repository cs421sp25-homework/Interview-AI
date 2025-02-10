import React, { useState } from 'react';
import { Button } from '/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FlaskDemo = () => {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleClick = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/data', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setResponse(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Flask-React Demo</h1>

            <Button
                onClick={handleClick}
                disabled={loading}
                className="w-full mb-4"
            >
                {loading ? 'Fetching...' : 'Get Data from Flask'}
            </Button>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                        Error: {error}
                    </AlertDescription>
                </Alert>
            )}

            {response && (
                <div className="rounded-lg border p-4">
                    <h2 className="text-lg font-semibold mb-2">Response from Flask:</h2>
                    <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(response, null, 2)}
          </pre>
                </div>
            )}
        </div>
    );
};

export default FlaskDemo;