#!/usr/bin/env node
/**
 * Direct ElevenLabs TTS with SSML support
 * Usage: node scripts/elevenlabs-tts.mjs "Text with <break time=\"1s\" /> pauses" output.mp3
 */

import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = 'j9jfwdrw7BRfcR43Qohk';
const DEFAULT_MODEL = 'eleven_multilingual_v2'; // Supports SSML break tags

async function generateSpeech(text, outputPath, voiceId = DEFAULT_VOICE_ID) {
	if (!ELEVENLABS_API_KEY) {
		console.error('Error: ELEVENLABS_API_KEY environment variable not set');
		console.error('Set it with: export ELEVENLABS_API_KEY=your_key_here');
		process.exit(1);
	}

	const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

	const body = {
		text,
		model_id: DEFAULT_MODEL,
		voice_settings: {
			stability: 0.5,
			similarity_boost: 0.75,
			style: 0.0,
			use_speaker_boost: true
		}
	};

	console.log(`Generating speech with model: ${DEFAULT_MODEL}`);
	console.log(`Voice ID: ${voiceId}`);
	console.log(`Text: ${text}`);
	console.log('');

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Accept': 'audio/mpeg',
				'Content-Type': 'application/json',
				'xi-api-key': ELEVENLABS_API_KEY
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API Error (${response.status}): ${errorText}`);
			process.exit(1);
		}

		const buffer = await response.arrayBuffer();
		fs.writeFileSync(outputPath, Buffer.from(buffer));

		const stats = fs.statSync(outputPath);
		console.log(`✓ Saved to: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);

	} catch (error) {
		console.error('Request failed:', error.message);
		process.exit(1);
	}
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
	console.log('Usage: node scripts/elevenlabs-tts.mjs "text" output.mp3 [voice_id]');
	console.log('');
	console.log('Supports SSML break tags: <break time="1.5s" />');
	console.log('');
	console.log('Example:');
	console.log('  node scripts/elevenlabs-tts.mjs "Hello. <break time=\\"1s\\" /> World." hello.mp3');
	process.exit(1);
}

const [text, output, voiceId] = args;
const outputPath = path.resolve(output);

generateSpeech(text, outputPath, voiceId || DEFAULT_VOICE_ID);
