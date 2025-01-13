// Accessing HTML elements
const webcam = document.getElementById("webcam");
const snapshotCanvas = document.getElementById("snapshot");
const analyzeButton = document.getElementById("analyzeButton");
const turnOnCameraButton = document.getElementById("turnOnCameraButton");
const turnOffCameraButton = document.getElementById("turnOffCameraButton");
const resultDiv = document.getElementById("result");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send");
const chatbotDiv = document.getElementById("chatbot");

let webcamStream = null;
let model = null;

// Function to turn on the webcam
async function turnOnWebcam() {
    try {
        // Request access to the user's webcam
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: true,
        });
        webcam.srcObject = webcamStream;
        resultDiv.textContent = "Webcam is turned on. Ready to analyze emotions.";
    } catch (error) {
        console.error("Error accessing webcam:", error);
        resultDiv.textContent = "Error accessing webcam. Please allow camera permissions.";
    }
}

// Function to turn off the webcam
function turnOffWebcam() {
    if (webcamStream) {
        const tracks = webcamStream.getTracks();
        tracks.forEach(track => track.stop());
        webcam.srcObject = null;
        resultDiv.textContent = "Webcam is turned off.";
    }
}

// Function to capture a snapshot from the webcam
function captureSnapshot() {
    const context = snapshotCanvas.getContext("2d");
    snapshotCanvas.width = webcam.videoWidth;
    snapshotCanvas.height = webcam.videoHeight;
    context.drawImage(webcam, 0, 0, webcam.videoWidth, webcam.videoHeight);
    return snapshotCanvas.toDataURL("image/jpeg");
}

// Analyze the emotion using the TensorFlow.js model
async function analyzeEmotion() {
    if (!webcamStream) {
        resultDiv.textContent = "Please turn on the webcam before analyzing emotions.";
        return;
    }

    if (!model) {
        resultDiv.textContent = "Loading model. Please wait...";
        try {
            model = await tf.loadLayersModel("models/model.json");
        } catch (error) {
            console.error("Error loading model:", error);
            resultDiv.textContent = "Failed to load model. Ensure model files are available.";
            return;
        }
    }

    const imageData = captureSnapshot();
    const img = new Image();
    img.src = imageData;
    img.onload = async () => {
        const tensor = tf.browser.fromPixels(img)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims(0)
            .div(255.0);

        const predictions = await model.predict(tensor).data();
        const emotions = ["Happy", "Sad", "Neutral", "Angry", "Surprised"];
        const maxIndex = predictions.indexOf(Math.max(...predictions));

        const detectedEmotion = emotions[maxIndex];
        resultDiv.textContent = `Detected Emotion: ${detectedEmotion}`;
        chatbotDiv.style.display = "block"; // Show chatbot
        onEmotionDetected(detectedEmotion.toLowerCase());
    };
}

// Fetch response from the Buddybot backend
async function fetchBuddybotResponse(emotion, userMessage = "") {
    try {
        const response = await fetch("http://127.0.0.1:5000/chatbot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ emotion, message: userMessage }),
        });
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("Error connecting to Buddybot:", error);
        return "Sorry, I couldn't connect to Buddybot. Please try again later.";
    }
}

// Display messages in the chat interface
function displayMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.textContent = message;
    messageDiv.className = sender === "user" ? "user-message" : "bot-message";
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Trigger Buddybot when an emotion is detected
async function onEmotionDetected(emotion) {
    const initialResponse = await fetchBuddybotResponse(emotion);
    displayMessage(`Emotion detected: ${emotion}`, "bot");
    displayMessage(initialResponse, "bot");
}

// Handle user input in the chat
chatSendButton.addEventListener("click", async () => {
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    displayMessage(userInput, "user");
    const detectedEmotion = "neutral"; // Replace with dynamic emotion detection if needed
    const BuddybotResponse = await fetchBuddybotResponse(detectedEmotion, userInput);
    displayMessage(BuddybotResponse, "bot");
    chatInput.value = "";
});

// Event listeners for button actions
turnOnCameraButton.addEventListener("click", turnOnWebcam);
turnOffCameraButton.addEventListener("click", turnOffWebcam);
analyzeButton.addEventListener("click", analyzeEmotion);
