// Imports removed


// Emulator URL for 'sendTestAlert'
// Default layout: http://127.0.0.1:5001/<project-id>/<region>/sendTestAlert
const PROJECT_ID = "content-alchemy-command-dev"; // From .firebaserc
const REGION = "us-central1"; // Default logic
const FUNCTION_NAME = "sendTestAlert";

const url = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/${FUNCTION_NAME}`;

console.log(`Triggering ${FUNCTION_NAME} at ${url}...`);

try {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: {} }) // Callable functions expect a "data" wrapper
    });

    const text = await response.text();

    if (response.ok) {
        console.log("SUCCESS! Function executed.");
        console.log("Response:", text);
    } else {
        console.error("FAILED. Status:", response.status);
        console.error("Response:", text);
    }
} catch (error) {
    console.error("Network Error:", error.message);
}
