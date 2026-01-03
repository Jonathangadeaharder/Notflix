import warnings

# Filter to ensure we see the warning
warnings.simplefilter('always', DeprecationWarning)

print("--- Testing imports ---")

try:
    print("Importing sentencepiece...")
    print("sentencepiece imported.")
except Exception as e:
    print(f"sentencepiece failed: {e}")

try:
    print("Importing google.protobuf...")
    print("google.protobuf imported.")
except Exception as e:
    print(f"google.protobuf failed: {e}")

try:
    print("Importing onnxruntime...")
    print("onnxruntime imported.")
except Exception as e:
    print(f"onnxruntime failed: {e}")

try:
    print("Importing faster_whisper...")
    print("faster_whisper imported.")
except Exception as e:
    print(f"faster_whisper failed: {e}")
