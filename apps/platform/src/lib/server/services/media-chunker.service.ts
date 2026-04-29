import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface ChunkMetadata {
  index: number;
  filePath: string;
  startTime: number;
  duration: number;
}

export class MediaChunkerService {
  /**
   * Extracts audio from a video and splits it into fixed-duration chunks.
   * @param inputFilePath Absolute path to the source video/audio file
   * @param outputDir Directory where chunks will be stored
   * @param chunkDurationSeconds Duration of each chunk in seconds (default: 300s / 5min)
   */
  async splitIntoAudioChunks(
    inputFilePath: string,
    outputDir: string,
    chunkDurationSeconds = 300,
  ): Promise<ChunkMetadata[]> {
    await mkdir(outputDir, { recursive: true });

    // Pattern for output files: chunk_001.mp3, chunk_002.mp3, etc.
    const outputPattern = join(outputDir, 'chunk_%03d.mp3');

    return new Promise((resolve, reject) => {
      // ffmpeg -i input.mp4 -f segment -segment_time 300 -c:a libmp3lame -ar 16000 chunk_%03d.mp3
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        inputFilePath,
        '-f',
        'segment',
        '-segment_time',
        chunkDurationSeconds.toString(),
        '-c:a',
        'libmp3lame',
        '-ar',
        '16000', // AI service typically prefers 16kHz
        '-ac',
        '1', // Mono
        outputPattern,
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`ffmpeg failed with code ${code}: ${stderr}`),
          );
        }

        // In a real implementation, we would scan the directory to find the generated files
        // and determine their exact durations. For now, we return a simplified list.
        // The orchestrator will use these to call the AI service.
        resolve([]);
      });
    });
  }

  /**
   * Simple audio extraction without chunking.
   */
  async extractAudio(
    inputFilePath: string,
    outputFilePath: string,
  ): Promise<void> {
    await mkdir(dirname(outputFilePath), { recursive: true });

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        inputFilePath,
        '-vn', // Disable video
        '-acodec',
        'libmp3lame',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-y', // Overwrite
        outputFilePath,
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else
          reject(new Error(`ffmpeg audio extraction failed with code ${code}`));
      });
    });
  }
}

export const mediaChunker = new MediaChunkerService();
