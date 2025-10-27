# embedding_server.py
# Windows-friendly Flask microservice for SpeechBrain ECAPA-TDNN embeddings

import os
# ⚡ Must set fetching strategy BEFORE importing SpeechBrain
os.environ["SB_FETCHING_STRATEGY"] = "copy"
os.environ["TORCH_HOME"] = r"C:\speechbrain_models"  # optional, to control cache

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torchaudio
from speechbrain.inference.speaker import SpeakerRecognition
import tempfile
import logging
from pydub import AudioSegment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ---------------- CONFIG ----------------
MODEL_SOURCE = "speechbrain/spkrec-ecapa-voxceleb"
MODEL_SAVE_DIR = r"C:\speechbrain_models\ecapa"
os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a'}

verification_model = None
# ----------------------------------------

def load_model():
    global verification_model
    try:
        logger.info(f"Loading ECAPA-TDNN model from {MODEL_SOURCE}...")
        verification_model = SpeakerRecognition.from_hparams(
            source=MODEL_SOURCE,
            savedir=MODEL_SAVE_DIR,
            run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"}
        )
        device = "GPU" if torch.cuda.is_available() else "CPU"
        logger.info(f"Model loaded successfully on {device}")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

# Load model on startup
load_model()

# ---------------- AUDIO CONVERSION ----------------
def convert_to_wav(input_path, output_path):
    """
    Convert any audio format to 16kHz mono WAV using pydub
    """
    audio = AudioSegment.from_file(input_path)  # automatically detects format
    audio = audio.set_channels(1)               # mono
    audio = audio.set_frame_rate(16000)        # 16kHz
    audio.export(output_path, format="wav")

# ---------------- ENDPOINTS ----------------
@app.route('/health', methods=['GET'])
def health_check():
    if verification_model is None:
        return jsonify({'status': 'unhealthy', 'message': 'Model not loaded'}), 503
    return jsonify({
        'status': 'healthy',
        'model': 'ECAPA-TDNN',
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    }), 200

@app.route('/info', methods=['GET'])
def service_info():
    return jsonify({
        'service': 'Voice Embedding Extraction Service',
        'model': 'SpeechBrain ECAPA-TDNN',
        'model_source': MODEL_SOURCE,
        'embedding_dimension': 192,
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'max_file_size_mb': MAX_FILE_SIZE / (1024 * 1024),
        'device': 'cuda' if torch.cuda.is_available() else 'cpu',
        'version': '1.0.0'
    }), 200

@app.route('/api/extract-embedding', methods=['POST'])
def extract_embedding():
    try:
        if verification_model is None:
            return jsonify({'error': 'Model not loaded. Service unavailable.'}), 503

        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided in request'}), 400

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        audio_file.seek(0, os.SEEK_END)
        file_size = audio_file.tell()
        audio_file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size: {MAX_FILE_SIZE / (1024 * 1024)}MB'}), 413

        # Save original upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as temp_file:
            temp_path = temp_file.name
            audio_file.save(temp_path)

        # Convert to 16kHz mono WAV
        converted_path = temp_path + "_converted.wav"
        convert_to_wav(temp_path, converted_path)

        try:
            logger.info(f"Processing audio file: {audio_file.filename}")
            signal, sample_rate = torchaudio.load(converted_path)

            logger.info("Extracting speaker embedding...")
            with torch.no_grad():
                embedding = verification_model.encode_batch(signal)

            embedding_array = embedding.squeeze().cpu().numpy()
            if len(embedding_array.shape) > 1:
                embedding_array = embedding_array.flatten()
            if len(embedding_array) != 192:
                raise ValueError(f"Unexpected embedding dimension: {len(embedding_array)}")

            embedding_list = embedding_array.tolist()
            logger.info(f"Successfully extracted embedding: dimension={len(embedding_list)}")

            return jsonify({
                'success': True,
                'embedding': embedding_list,
                'dimension': len(embedding_list),
                'sample_rate': sample_rate,
                'audio_duration_seconds': float(signal.shape[1] / sample_rate)
            }), 200

        except Exception as e:
            logger.error(f"Error processing audio: {e}")
            return jsonify({'error': f'Failed to process audio: {str(e)}'}), 500

        finally:
            # Clean up temp files
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(converted_path):
                os.remove(converted_path)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# ---------------- ERROR HANDLERS ----------------
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ---------------- RUN ----------------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    logger.info(f"Starting embedding service on port {port}")
    logger.info(f"Debug mode: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
