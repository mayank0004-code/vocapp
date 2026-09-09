const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();
let ai = null;
function getAI() {
  if (!ai) {
    console.log("Firebase parse process.version:", process.version);
    const { GoogleGenAI } = require('@google/genai');
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-deployment-hang"
    });
  }
  return ai;
}

const MODEL_NAME = 'gemini-3.5-flash-lite';

exports.fetchWordBreakdown = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { word, contextSentence } = request.data;
  if (!word) throw new HttpsError('invalid-argument', 'Word is required.');

  const prompt = `
    You are an expert vocabulary tutor. Analyze the word "${word}".
    ${contextSentence ? `The user encountered this word in the following context: "${contextSentence}". Please tailor your definition, vibe check, and example to this specific context.` : ''}
    First, check if this is a valid English word (allow minor misspellings by auto-correcting them, but completely reject gibberish).
    Provide a JSON response containing exactly the following keys:
    - "isValid": boolean (false if gibberish or not a real word).
    - "word": string (The correctly spelled word).
    - "definition": A clear, concise definition (empty if invalid).
    - "origin": A brief etymology showing the language of origin and breaking down the root words and their meanings (e.g. "Greek: phil (love) + anthropy (human beings)"). (empty if invalid).
    - "vibeCheck": A short explanation of the tone and formality (empty if invalid).
    - "contextMeaning": What the provided context sentence means (leave empty if no context sentence or invalid).
    - "collocations": An array of exactly 3 words it is frequently paired with (empty if invalid).
    - "example": A realistic, real-world example sentence using the word (empty if invalid).
    - "commonMistakes": An array of 2-3 common mistakes people make when using this word, with a brief explanation of WHY it's wrong or HOW NOT to use it (empty array if invalid).
    - "practiceHints": An object with three keys: "factual", "personal", and "question". Provide a short specific hint for writing each type of sentence using this word. (e.g., for ubiquitous: { "factual": "State a known fact about something that is everywhere (like smartphones)", "personal": "Describe something you see everywhere in your daily life", "question": "Ask if someone thinks a specific technology is becoming ubiquitous" }) (empty object if invalid).
    
    Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error(error);
    throw new HttpsError('internal', 'Failed to fetch breakdown');
  }
});

exports.evaluateSentence = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { word, sentenceType, sentence, mistakePatterns } = request.data;
  if (!word || !sentenceType || !sentence) throw new HttpsError('invalid-argument', 'Missing arguments.');

  const prompt = `
    You are an expert, encouraging English writing coach. The student is practicing the word "${word}".
    They were asked to write a "${sentenceType}" sentence (Factual, Personal, or Question).
    
    Student's historical context (if any): ${mistakePatterns || 'None'}
    
    Student's sentence: "${sentence}"
    
    Evaluate the sentence for:
    1. Proper context and accurate usage of the word "${word}".
    2. Whether it actually matches the requested type ("${sentenceType}").
    3. Sentence flow and grammatical correctness.
    
    CRITICAL RULE - "Smart Leniency": 
    1. Ignore minor or trivial punctuation errors (like a missing period at the end of a factual sentence or missing commas). ONLY flag punctuation if it structurally breaks the sentence (e.g., missing a question mark for a Question sentence). Focus heavily on flow, usage, and comprehension.
    2. CRITICAL: Completely ignore all capitalization errors (like starting a sentence with a lowercase letter). Do not penalize the user, generate error tags, or mention capitalization in the feedback under any circumstances.
    If they struggle with specific things in their historical context, adapt your feedback to gently coach them on those patterns.
    
    Provide a JSON response with exactly the following keys:
    - "isCorrect": boolean (true if the sentence is grammatically solid, flows well, uses the word correctly, and matches the type. minor punctuation errors should be true).
    - "feedback": string (If isCorrect is false, explain why gently and coach them. If true, offer a short encouraging remark).
    - "reframedSentence": string (A beautifully corrected, native-sounding version of the user's EXACT idea. Provide this ONLY if isCorrect is false OR if the sentence is technically correct but the flow is awkward and could be significantly improved. Otherwise, leave empty).
    - "errorTags": array of strings (If isCorrect is false, categorize the errors into tags like "grammar", "flow", "context", "format", "punctuation". Leave empty if correct).
    
    Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    throw new HttpsError('internal', 'Failed to evaluate sentence');
  }
});

exports.evaluateQuizAnswer = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { targetWord, sentence, guess } = request.data;
  if (!targetWord || !sentence || !guess) throw new HttpsError('invalid-argument', 'Missing arguments.');

  const prompt = `
    You are evaluating a student's answer in a fill-in-the-blank vocabulary quiz.
    The original sentence is: "${sentence}"
    The target word that was blanked out is: "${targetWord}"
    The student guessed: "${guess}"
    
    Evaluate if the student's guess is correct. It should be the target word or a very closely related valid form of it (e.g., plurals, different verb tenses if they fit). Ignore capitalization completely.
    
    Provide a JSON response with exactly two keys:
    - "isCorrect": boolean (true if correct, false if incorrect).
    - "feedback": string (If incorrect, gently tell them the correct word. If correct, a short "Correct!").
    
    Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    throw new HttpsError('internal', 'Failed to evaluate quiz answer');
  }
});

exports.generateQuizQuestion = onCall({ cors: true, memory: "512MiB", maxInstances: 10 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { word, definition } = request.data;
  if (!word) throw new HttpsError('invalid-argument', 'Word is required.');

  const formats = ['fill-in-the-blank', 'multiple-choice', 'true-false', 'sentence-scramble', 'sentence-transformation', 'flashcard'];
  const selectedFormat = formats[Math.floor(Math.random() * formats.length)];

  const prompt = `
    You are a creative vocabulary quiz generator. Create a challenging quiz question for the word "${word}" (definition: ${definition || 'not provided'}).
    You MUST generate exactly ONE question in the "${selectedFormat}" format, according to these rules:
    
    1. "fill-in-the-blank": Write a brand new, highly contextual sentence where the word "${word}" would perfectly fit. Replace the word with "________".
    2. "multiple-choice": Write a question testing the meaning, synonym, or antonym of the word. Provide 4 options (A, B, C, D).
    3. "true-false": Write a sentence that either uses the word perfectly correctly OR completely incorrectly.
    4. "sentence-scramble": Write a native-sounding, interesting sentence using the word "${word}". 
    5. "sentence-transformation": Write a basic, simple sentence that DOES NOT use the word "${word}", but has the exact same meaning as the word. The user will be asked to rewrite it using "${word}".
    6. "flashcard": No specific question needed, just provide a very short, evocative phrase as a memory trigger for the word.
    
    Provide a JSON response with exactly the following keys:
    - "type": string (MUST be exactly "${selectedFormat}")
    - "question": string (The sentence with a blank, the MCQ question, the True/False sentence, the scramble sentence, the basic sentence to transform, or the flashcard trigger phrase)
    - "options": array of strings (If type is "multiple-choice", provide exactly 4 strings. Otherwise, an empty array)
    - "correctAnswer": string (For "fill-in-the-blank", "sentence-transformation" and "flashcard", it must be the target word. For "multiple-choice", provide the EXACT string of the correct option. For "true-false", provide exactly "true" or "false" as a string. For "sentence-scramble", provide the full correct sentence.)
    - "explanation": string (A short explanation of WHY that is the correct answer)
    
    Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.8 }
    });

    const text = response.text;
    return JSON.parse(text);    
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new HttpsError('internal', 'Failed to generate quiz question.');
  }
});

exports.sendSmartNotifications = onSchedule({ schedule: '0 * * * *', memory: '512MiB', maxInstances: 1 }, async (event) => {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').get();
  const now = new Date();
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    try {
      const settingsDoc = await db.collection('users').doc(userId).collection('profile').doc('settings').get();
      if (!settingsDoc.exists) continue;
      
      const settings = settingsDoc.data();
      if (!settings.notificationsEnabled || !settings.fcmToken) continue;
      
      const tz = settings.timezone || 'UTC';
      const optionsHour = { timeZone: tz, hour: 'numeric', hour12: false, hourCycle: 'h23' };
      const localHour = parseInt(new Intl.DateTimeFormat('en-US', optionsHour).format(now));
      const localWeekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
      
      let targetHour = 18;
      const statsDoc = await db.collection('users').doc(userId).collection('profile').doc('stats').get();
      const stats = statsDoc.exists ? statsDoc.data() : {};
      
      if (settings.timingMode === 'custom' && settings.customTime) {
        targetHour = parseInt(settings.customTime.split(':')[0]);
      } else if (settings.timingMode === 'smart' && stats.activityHours) {
        let maxHour = '18';
        let maxVal = -1;
        for (const [hour, count] of Object.entries(stats.activityHours)) {
          if (count > maxVal) {
            maxVal = count;
            maxHour = hour;
          }
        }
        targetHour = parseInt(maxHour);
      }
      
      if (localHour !== targetHour) continue;
      
      const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
      if (stats.lastPracticedDate === localToday) continue; // Already practiced today
      
      const lastPracticedStr = stats.lastPracticedDate || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(now.getTime() - 86400000));
      const lastPracticedTime = new Date(lastPracticedStr).getTime();
      const daysInactive = Math.max(0, Math.floor((now.getTime() - lastPracticedTime) / (1000 * 60 * 60 * 24)));
      
      let tone = 'Encouraging';
      if (daysInactive >= 7) {
        tone = 'PassiveAggressive';
      } else if (daysInactive >= 3) {
        tone = 'ToughLove';
      } else {
        const tones = ['Encouraging', 'FOMO', 'Curiosity'];
        tone = tones[Math.floor(Math.random() * tones.length)];
      }
      
      const vocabSnapshot = await db.collection('users').doc(userId).collection('vocabulary').get();
      const allWords = vocabSnapshot.docs.map(d => d.data());
      
      const dueWords = allWords.filter(w => {
        if (!w.nextReviewDate) return false;
        const reviewDateStr = new Date(w.nextReviewDate).toISOString().split('T')[0];
        return reviewDateStr <= localToday;
      });
      
      if (dueWords.length === 0 && daysInactive < 7) continue;
      
      const contextWords = dueWords.slice(0, 3).map(w => w.word).join(', ');
      
      const ai = getAI();
      const prompt = `
        You are an AI notification engine for a language learning app.
        Generate a short, punchy JSON push notification payload.
        Context: User is on a ${stats.currentStreak || 0}-day streak. They have ${dueWords.length} words due for review.
        Some due words include: ${contextWords}.
        Current time context: ${localWeekday} ${localHour < 12 ? 'morning' : localHour < 18 ? 'afternoon' : 'evening'}.
        Tone to use: ${tone}.
        If tone is PassiveAggressive (inactive for 7+ days), freeze their progress and tell them you are pausing reminders.
        Also generate a "Micro-Learning" quiz for the body if tone allows.
        Return JSON exactly like this: { "title": "string (max 40 chars)", "body": "string (max 100 chars)" }
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsed = JSON.parse(response.text);
      
      const payload = {
        token: settings.fcmToken,
        notification: { title: parsed.title, body: parsed.body },
        data: { action1: "Start Quiz", tone: tone, url: "/" }
      };
      
      await admin.messaging().send(payload);
    } catch (e) {
      console.error('Failed to send notification for user ' + userId, e);
    }
  }
});
