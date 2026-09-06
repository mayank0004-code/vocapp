const { onCall, HttpsError } = require('firebase-functions/v2/https');

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
  
  const { word, sentenceType, sentence } = request.data;
  if (!word || !sentenceType || !sentence) throw new HttpsError('invalid-argument', 'Missing arguments.');

  const prompt = `
    You are a strict but encouraging English tutor. The student is practicing the word "${word}".
    They were asked to write a "${sentenceType}" sentence (Factual, Personal, or Question).
    
    Student's sentence: "${sentence}"
    
    Evaluate the sentence for:
    1. Grammatical correctness (ignore capitalization mistakes).
    2. Proper context and accurate usage of the word "${word}".
    3. Whether it actually matches the requested type ("${sentenceType}").
    
    Provide a JSON response with exactly two keys:
    - "isCorrect": boolean (true if the sentence is good, false if they need to try again).
    - "feedback": string (If isCorrect is false, strictly and clearly explain why and encourage them to try again. If true, offer a short encouraging remark).
    
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

  const prompt = `
    You are a creative vocabulary quiz generator. Create a challenging quiz question for the word "${word}" (definition: ${definition || 'not provided'}).
    Randomly select ONE of the following three formats to generate:
    
    1. "fill-in-the-blank": Write a brand new, highly contextual sentence where the word "${word}" would perfectly fit. Replace the word with "________".
    2. "multiple-choice": Write a question testing the meaning, synonym, or antonym of the word. Provide 4 options (A, B, C, D).
    3. "true-false": Write a sentence that either uses the word perfectly correctly OR completely incorrectly (e.g., grammatically wrong or wrong context).
    
    Provide a JSON response with exactly the following keys:
    - "type": string (must be exactly "fill-in-the-blank", "multiple-choice", or "true-false")
    - "question": string (The sentence with a blank, the MCQ question, or the True/False sentence to evaluate)
    - "options": array of strings (If type is "multiple-choice", provide exactly 4 strings. Otherwise, an empty array)
    - "correctAnswer": string (For "fill-in-the-blank", it must be the target word. For "multiple-choice", provide the EXACT string of the correct option. For "true-false", provide exactly "true" or "false" as a string)
    - "explanation": string (A short explanation of WHY that is the correct answer, which will be shown after they guess)
    
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
    console.error(error);
    throw new HttpsError('internal', 'Failed to generate quiz question');
  }
});
