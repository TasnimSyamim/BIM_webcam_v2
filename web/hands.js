const mpHands = window;
const drawingUtils = window;
const controls = window;
const controls3d = window;

// Input and canvas setup
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');


// Buttons
const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const saveRecordingButton = document.getElementById('saveRecording');

// MediaRecorder variables
let mediaRecorder;
let recordedChunks = [];

// Button functionality
startRecordingButton.addEventListener('click', () => {
    startRecordingButton.style.display = 'none';
    stopRecordingButton.style.display = 'inline-block';

    const stream = canvasElement.captureStream(30); // Capture canvas at 30 FPS
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        saveRecordingButton.disabled = false; // Enable save button
    };

    mediaRecorder.start();
});

stopRecordingButton.addEventListener('click', () => {
    stopRecordingButton.style.display = 'none';
    startRecordingButton.style.display = 'inline-block';

    mediaRecorder.stop(); // Stop recording
});

saveRecordingButton.addEventListener('click', () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.webm';
    a.click();

    // Reset recording state
    recordedChunks = [];
    saveRecordingButton.disabled = true;
});

// MediaPipe Hands configuration
const config = { locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}/${file}` };
const hands = new mpHands.Hands(config);
hands.onResults(onResults);

// Control panel for settings
new controls.ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
    .add([
        new controls.StaticText({ title: 'MediaPipe Hands' }),
        new controls.FPS(),
        new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
        new controls.SourcePicker({
            onFrame: async (input, size) => {
                // const aspect = size.height / size.width;
                const aspect = 1080 / 1920;
                let width, height;
                if (window.innerWidth > window.innerHeight) {
                    height = window.innerHeight;
                    width = height / aspect;
                } else {
                    width = window.innerWidth;
                    height = width * aspect;
                }
                canvasElement.width = width;
                canvasElement.height = height;
                await hands.send({ image: input });
            },
        }),
        new controls.Slider({
            title: 'Max Number of Hands',
            field: 'maxNumHands',
            range: [1, 4],
            step: 1
        }),
        new controls.Slider({
            title: 'Model Complexity',
            field: 'modelComplexity',
            discrete: ['Lite', 'Full'],
        }),
        new controls.Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new controls.Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01
        }),
    ])
    .on((x) => {
        const options = x;
        videoElement.classList.toggle('selfie', options.selfieMode);
        hands.setOptions(options);
    });

function onResults(results) {
    document.body.classList.add('loaded');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
            const classification = results.multiHandedness[index];
            const isRightHand = classification.label === 'Right';
            const landmarks = results.multiHandLandmarks[index];
            drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, { color: isRightHand ? '#00FF00' : '#FF0000' });
            drawingUtils.drawLandmarks(canvasCtx, landmarks, {
                color: isRightHand ? '#00FF00' : '#FF0000',
                fillColor: isRightHand ? '#FF0000' : '#00FF00',
                radius: (data) => drawingUtils.lerp(data.from.z, -0.15, .1, 10, 1),
            });
        }
    }

    canvasCtx.restore();
}
