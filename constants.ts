
import { StoryElementsState, OutputFieldsState } from './types';

export const INITIAL_STORY_ELEMENTS_STATE: StoryElementsState = {
    idea: '',
    theme: '',
    tone: '',
    genre: '',
    characterDemographic: '',
    characterArchetype: '',
    locationSpecific: ''
};

export const INITIAL_OUTPUT_FIELDS_STATE: OutputFieldsState = {
    pitch: { 
        id: 'pitch', label: 'Elevator Pitch', value: '', isLoading: false, rows:4,
        placeholder: 'Select a logline suggestion to generate content...', 
        promptGenerator: (logline: string) => `You are a Hollywood producer. Write a short, punchy "elevator pitch" (3-4 sentences) for the following logline. Make it exciting and high-concept. Do not add conversational text, just the pitch. LOGLINE: "${logline}"`
    },
    instagram: { 
        id: 'instagram', label: 'Instagram Post', value: '', isLoading: false, rows:5,
        placeholder: 'Select a logline suggestion to generate content...',
        promptGenerator: (logline: string) => `You are a social media influencer. Write an engaging Instagram post about this story idea. Use emojis and a strong call to action. Include 5-7 relevant hashtags. Do not add conversational text, just the post. LOGLINE: "${logline}"`
    },
    twitter: {
        id: 'twitter', label: 'For X (Twitter)', value: '', isLoading: false, rows:3,
        placeholder: 'Select a logline suggestion to generate content...',
        promptGenerator: (logline: string) => `You are a viral content creator. Write a punchy Tweet (under 280 chars) to announce this story idea, including 3-4 relevant hashtags. Do not add any conversational text, just the tweet. LOGLINE: "${logline}"`
    },
    synopsis: {
        id: 'synopsis', label: 'Short Synopsis (Netflix, etc.)', value: '', isLoading: false, rows:3,
        placeholder: 'Select a logline suggestion to generate content...',
        promptGenerator: (logline: string) => `You are a professional screenwriter. Expand this logline into a short, thrilling synopsis (2-3 sentences) suitable for a streaming service. Do not add any conversational text, just the synopsis. LOGLINE: "${logline}"`
    }
};

export const SELECT_OPTIONS_CONFIG: Record<string, string[]> = {
    genre: ['Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'],
    characterDemographic: ['A man', 'A woman', 'A teenager', 'A team of scientists', 'A non-binary person', 'A group of friends', 'A loyal dog'],
    characterArchetype: ['A reluctant hero', 'A cynical anti-hero', 'A charming rogue', 'A wise mentor', 'A power-hungry villain', 'The chosen one'],
    locationSpecific: ['A cyberpunk metropolis', 'A haunted mansion', 'An abandoned space station', 'A magical academy', 'A post-apocalyptic wasteland', 'A small town with a dark secret'],
    tone: ['Humorous', 'Gritty', 'Whimsical', 'Suspenseful', 'Heartwarming', 'Satirical', 'Serious']
};

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash";