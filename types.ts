
export interface StoryElementsState {
    idea: string;
    theme: string;
    tone: string;
    genre: string;
    characterDemographic: string;
    characterArchetype: string;
    locationSpecific: string;
    [key: string]: string;
}

export interface OutputField {
    id: string;
    label: string;
    value: string;
    isLoading: boolean;
    rows: number;
    placeholder: string;
    promptGenerator: (logline: string) => string;
}

export type OutputFieldsState = Record<string, OutputField>;

export interface AnalyzedStoryElements {
    genre: string;
    characterDemographic: string;
    characterArchetype: string;
    locationSpecific: string;
    tags: string[];
}