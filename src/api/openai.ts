import OpenAI from 'openai';

// Use environment variable or placeholder for API key
// IMPORTANT: Never hardcode API keys in source code
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-api-key-here";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Define prompt for simple food description
const FOOD_DESCRIPTION_PROMPT = `
You are a nutritional expert analyzing food images. 
Describe this food image in 2-3 concise sentences, focusing on:
1. Main ingredients visible
2. Preparation methods (fried, baked, grilled, etc.)
3. Approximate portion size
4. Any other significant observations

Keep your description brief, factual, and focused only on what you can clearly see in the image.
`;

// Define prompt for heart health scoring
const HEART_HEALTH_ANALYSIS_PROMPT = `
You are a nutritional expert analyzing food for heart health. Based on the provided food description:

Score the following factors on a scale of 1-10 (where 10 is optimal for heart health):
1. Unhealthy Fat Score: Rate and briefly explain (1 sentence)
2. Healthy Fat Score: Rate and briefly explain (1 sentence)
3. Sodium Content Score: Rate and briefly explain (1 sentence)
4. Fiber Content Score: Rate and briefly explain (1 sentence)
5. Nutrient Density Score: Rate and briefly explain (1 sentence)
6. Processing Level Score: Rate and briefly explain (1 sentence)
7. Sugar Content Score: Rate and briefly explain (1 sentence)
8. Additives Score: Rate and briefly explain (1 sentence)

Calculate an Overall Heart Health Score as a weighted average using these percentages:
- Unhealthy Fat (15%)
- Healthy Fat (10%)
- Sodium Content (10%)
- Fiber Content (15%)
- Nutrient Density (20%)
- Processing Level (10%)
- Sugar Content (10%)
- Additives (10%)

Also provide one key takeaway for improving the heart-healthiness of this food.

Return your analysis as a structured JSON object with this exact format:
{
  "scores": {
    "unhealthyFat": { "score": X, "explanation": "Brief explanation" },
    "healthyFat": { "score": X, "explanation": "Brief explanation" },
    "sodium": { "score": X, "explanation": "Brief explanation" },
    "fiber": { "score": X, "explanation": "Brief explanation" },
    "nutrientDensity": { "score": X, "explanation": "Brief explanation" },
    "processingLevel": { "score": X, "explanation": "Brief explanation" },
    "sugar": { "score": X, "explanation": "Brief explanation" },
    "additives": { "score": X, "explanation": "Brief explanation" }
  },
  "overallScore": X.X,
  "keyTakeaway": "One key improvement suggestion"
}
`;

// Define the type for heart health analysis response
export interface HeartHealthAnalysis {
  scores: {
    unhealthyFat: { score: number; explanation: string };
    healthyFat: { score: number; explanation: string };
    sodium: { score: number; explanation: string };
    fiber: { score: number; explanation: string };
    nutrientDensity: { score: number; explanation: string };
    processingLevel: { score: number; explanation: string };
    sugar: { score: number; explanation: string };
    additives: { score: number; explanation: string };
  };
  overallScore: number;
  keyTakeaway: string;
}

/**
 * Gets a simple description of the food in the image
 * @param imageBase64 Base64 encoded image string
 * @returns A simple description of the food
 */
export const getFoodDescription = async (imageBase64: string): Promise<string> => {
  try {
    console.log("Getting food description...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: FOOD_DESCRIPTION_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log("Description generated successfully");
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No description received from OpenAI");
    }
    
    return content.trim();
  } catch (error) {
    console.error("Error getting food description:", error);
    throw new Error("Failed to describe the image. Please try again.");
  }
};

/**
 * Analyzes a food description for heart health
 * @param foodDescription Description of the food
 * @returns Heart health analysis with scores
 */
export const analyzeHeartHealth = async (foodDescription: string): Promise<HeartHealthAnalysis> => {
  try {
    console.log("Analyzing heart health based on description...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: HEART_HEALTH_ANALYSIS_PROMPT,
        },
        {
          role: "user",
          content: `Food Description: ${foodDescription}`,
        },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    console.log("Heart health analysis completed");
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No analysis received from OpenAI");
    }
    
    try {
      // Parse the JSON response
      const analysis: HeartHealthAnalysis = JSON.parse(content);
      return analysis;
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Failed to parse analysis response");
    }
  } catch (error) {
    console.error("Error analyzing heart health:", error);
    throw new Error("Failed to analyze heart health. Please try again.");
  }
};

/**
 * Updates the food description with user input
 * @param originalDescription The original food description
 * @param userInput Additional user input
 * @returns Updated food description
 */
export const updateFoodDescription = async (
  originalDescription: string,
  userInput: string
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutritional expert updating a food description based on additional user information.",
        },
        {
          role: "user",
          content: `Original description: "${originalDescription}"\n\nUser additional information: "${userInput}"\n\nPlease create an updated, concise (2-3 sentences) food description that incorporates both the original description and the user's additional information.`,
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return originalDescription;
    }
    
    return content.trim();
  } catch (error) {
    console.error("Error updating description:", error);
    return originalDescription; // Fallback to original description on error
  }
}; 