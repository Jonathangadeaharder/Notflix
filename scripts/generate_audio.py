from gtts import gTTS
import os

text = "Hola mundo. Esto es una prueba de transcripcion y analisis de vocabulario. El gato corre."
lang = 'es'

output_file = "test_audio.mp3"

tts = gTTS(text=text, lang=lang, slow=False)
tts.save(output_file)

print(f"Generated {output_file}")
