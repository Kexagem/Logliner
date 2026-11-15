
import React, { useState, useCallback, useEffect } from 'react';
import { StoryElementsState, OutputField, OutputFieldsState, AnalyzedStoryElements } from './types';
import { INITIAL_STORY_ELEMENTS_STATE, INITIAL_OUTPUT_FIELDS_STATE, SELECT_OPTIONS_CONFIG } from './constants';
import usePersistentState from './hooks/usePersistentState';
import { generateText, generateJson, generateTextStream } from './services/geminiService';
import InputSelect from './components/InputSelect';
import SkeletonCard from './components/SkeletonCard';
import IconButton from './components/IconButton';
import { 
    LogoIcon, TrashIcon, SparklesIcon, PaperclipIcon, 
    ClipboardIcon, SpinnerIcon, WandIcon, DiceIcon, CheckIcon
} from './components/Icons';

const App: React.FC = () => {
  const [storyElements, setStoryElements] = usePersistentState<StoryElementsState>('story_elements', INITIAL_STORY_ELEMENTS_STATE);
  const [loglineSuggestions, setLoglineSuggestions] = usePersistentState<string[]>('logline_suggestions', []);
  const [selectedLogline, setSelectedLogline] = usePersistentState<string | null>('selected_logline', null);
  const [outputFields, setOutputFields] = usePersistentState<OutputFieldsState>('output_fields', INITIAL_OUTPUT_FIELDS_STATE);
  const [generatedTags, setGeneratedTags] = usePersistentState<string[]>('generated_tags', []);
  const [selectedTags, setSelectedTags] = usePersistentState<string[]>('selected_tags', []);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  const handleAnalyzeIdea = useCallback(async () => {
      if (!storyElements.idea.trim()) {
          setError("Please enter an idea to analyze.");
          return;
      }
      setIsAnalyzing(true);
      setError(null);
      setGeneratedTags([]);
      setSelectedTags([]);
      
      const prompt = `As a story analyst, read the user's idea.
Your response MUST be a valid JSON object.
The JSON object should have the following properties:
- "genre": A string chosen from these options: ${SELECT_OPTIONS_CONFIG.genre.join(', ')}. Select the most fitting one.
- "characterDemographic": A string chosen from these options: ${SELECT_OPTIONS_CONFIG.characterDemographic.join(', ')}. Select the most fitting one.
- "characterArchetype": A string chosen from these options: ${SELECT_OPTIONS_CONFIG.characterArchetype.join(', ')}. Select the most fitting one.
- "locationSpecific": A string chosen from these options: ${SELECT_OPTIONS_CONFIG.locationSpecific.join(', ')}. Select the most fitting one.
- "tags": An array of 5-7 strings, where each string is a contextual keyword or short phrase from the idea that captures its tone, theme, or key objects (e.g., "Betrayal", "Time Loop", "Ancient Artifact", "Moral Dilemma").

User Idea: "${storyElements.idea}"

Provide ONLY the JSON object in your response, without any surrounding text, comments, or markdown fences.`;

      try {
          const result = await generateJson<AnalyzedStoryElements>(prompt);
          const { tags, ...analyzedElements } = result;
          setStoryElements(prev => ({ ...prev, ...analyzedElements }));
          if (tags && Array.isArray(tags)) {
              setGeneratedTags(tags);
          } else {
              setGeneratedTags([]); // Ensure tags is an array, even if missing or wrong type
          }
      } catch (err) {
          console.error("Failed to analyze idea:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(`Failed to analyze idea: ${errorMessage}`);
      } finally {
          setIsAnalyzing(false);
      }
  }, [storyElements.idea, setStoryElements, setGeneratedTags, setSelectedTags]);
    
  const handleGenerateLoglines = useCallback(async () => {
    setIsGenerating(true);
    setLoglineSuggestions([]);
    setSelectedLogline(null);
    setOutputFields(INITIAL_OUTPUT_FIELDS_STATE); 
    setError(null);

    let prompt = `Generate 5 unique and compelling loglines for a story with the following elements. Respond with only the loglines, each on a new line, without any extra text, titles, or numbering.
    - Idea: ${storyElements.idea || 'Any creative idea'}`;

    if (storyElements.theme.trim()) {
        prompt += `\n    - Theme: ${storyElements.theme.trim()}`;
    }
    if (storyElements.tone.trim()) {
        prompt += `\n    - Tone: ${storyElements.tone.trim()}`;
    }
    
    prompt += `
    - Genre: ${storyElements.genre || 'Any genre'}
    - Character: ${storyElements.characterDemographic || 'Any character'} ${storyElements.characterArchetype || ''}
    - Setting: ${storyElements.locationSpecific || 'Any setting'}`;
    
    if (selectedTags.length > 0) {
        prompt += `\n- Incorporate these thematic tags: ${selectedTags.join(', ')}`;
    }

    try {
        const stream = await generateTextStream(prompt);
        let buffer = '';
        let generatedSomething = false;

        for await (const chunk of stream) {
            if (chunk.text) {
                buffer += chunk.text;
                const lines = buffer.split('\n');

                if (lines.length > 1) {
                    const completeLines = lines.slice(0, -1);
                    const newLines = completeLines.map(l => l.trim().replace(/^- /,'')).filter(Boolean);

                    if (newLines.length > 0) {
                        generatedSomething = true;
                        setLoglineSuggestions(prev => {
                            const combined = [...prev, ...newLines];
                            return [...new Set(combined)]; // Use Set to prevent duplicates from overlapping chunks
                        });
                    }
                    buffer = lines[lines.length - 1];
                }
            }
        }

        const finalLine = buffer.trim().replace(/^- /, '');
        if (finalLine) {
            generatedSomething = true;
            setLoglineSuggestions(prev => {
                if (!prev.includes(finalLine)) {
                    return [...prev, finalLine];
                }
                return prev;
            });
        }
        
        if (!generatedSomething) {
            setError("The AI couldn't generate loglines. Try refining your input or try again.");
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Failed to generate loglines:", err);
        setError(`Failed to generate loglines: ${errorMessage}`);
    } finally {
        setIsGenerating(false);
    }
  }, [storyElements, selectedTags, setLoglineSuggestions, setSelectedLogline, setOutputFields]);

  const handleSelectLogline = useCallback(async (logline: string) => {
    setSelectedLogline(logline);
    const newOutputFields = { ...INITIAL_OUTPUT_FIELDS_STATE }; // Use fresh initial state for values
    
    Object.keys(newOutputFields).forEach(key => {
        newOutputFields[key] = { ...newOutputFields[key], value: '', isLoading: true, placeholder: "Generating..." };
    });
    setOutputFields(newOutputFields);
    setError(null);

    try {
        const promises = Object.values(INITIAL_OUTPUT_FIELDS_STATE).map(async (fieldConfig) => {
            try {
                const text = await generateText(fieldConfig.promptGenerator(logline));
                return { id: fieldConfig.id, text: text.trim(), error: false };
            } catch (err) {
                console.error(`Error generating content for ${fieldConfig.label}:`, err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                return { id: fieldConfig.id, text: `Content generation for ${fieldConfig.label} failed. Reason: ${errorMessage}`, error: true };
            }
        });

        const results = await Promise.all(promises);

        setOutputFields(prev => {
            const finalState = { ...prev };
            results.forEach(result => {
                if (finalState[result.id]) {
                    finalState[result.id] = { 
                        ...finalState[result.id], 
                        value: result.text, 
                        isLoading: false,
                        placeholder: result.error ? "Failed to generate. See error below." : INITIAL_OUTPUT_FIELDS_STATE[result.id].placeholder
                    };
                }
            });
            return finalState;
        });
    } catch (err) { // This catch is for Promise.all itself, less likely if individual errors are handled.
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`A critical error occurred while generating content: ${errorMessage}`);
        // Reset loading states for all fields if Promise.all fails
        setOutputFields(prev => {
            const errorState = {...prev};
            Object.keys(errorState).forEach(key => {
                errorState[key].isLoading = false;
                errorState[key].placeholder = "Generation failed due to a critical error.";
            });
            return errorState;
        });
    }
  }, [setOutputFields, setSelectedLogline]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStoryElements(prev => ({ ...prev, [name]: value }));
  }, [setStoryElements]);
  
  const handleClearAll = useCallback(() => {
    setStoryElements(INITIAL_STORY_ELEMENTS_STATE);
    setLoglineSuggestions([]);
    setSelectedLogline(null);
    setOutputFields(INITIAL_OUTPUT_FIELDS_STATE);
    setGeneratedTags([]);
    setSelectedTags([]);
    setError(null);
  }, [setStoryElements, setLoglineSuggestions, setSelectedLogline, setOutputFields, setGeneratedTags, setSelectedTags]);
  
  const handleRandomize = useCallback(() => {
      const randomElements: Partial<StoryElementsState> = {};
      Object.keys(SELECT_OPTIONS_CONFIG).forEach(key => {
          const options = SELECT_OPTIONS_CONFIG[key as keyof typeof SELECT_OPTIONS_CONFIG];
          if (options && options.length > 0) {
            const randomIndex = Math.floor(Math.random() * options.length);
            randomElements[key] = options[randomIndex];
          }
      });
      setStoryElements(prev => ({...INITIAL_STORY_ELEMENTS_STATE, idea: '', theme: '', ...randomElements}));
      setGeneratedTags([]);
      setSelectedTags([]);
      setError(null);
      setLoglineSuggestions([]);
      setSelectedLogline(null);
      setOutputFields(INITIAL_OUTPUT_FIELDS_STATE);
  }, [setStoryElements, setGeneratedTags, setSelectedTags, setLoglineSuggestions, setSelectedLogline, setOutputFields]);
  
  const handleTagToggle = (tag: string) => {
      setSelectedTags(prev => 
          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
  };

  const handleCopy = useCallback(async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
          setCopiedState(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      setError("Failed to copy text to clipboard. Your browser might not support this feature or permissions are denied.");
    }
  }, []);

  return (
      <div className="min-h-screen flex flex-col text-slate-300 p-4 lg:p-6 font-sans bg-slate-950">
        <header className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
                <LogoIcon />
                <div>
                    <h1 className="text-2xl font-bold text-white" style={{fontFamily: "'Exo 2', sans-serif"}}>LOGLINER</h1>
                    <p className="text-sm text-slate-400">Craft the core of your story with AI</p>
                </div>
            </div>
            <IconButton tooltip="Clear All Inputs & Outputs" onClick={handleClearAll}>
                <TrashIcon />
            </IconButton>
        </header>

        <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 min-h-0">
            {/* Column 1: Story Elements */}
            <div className="lg:col-span-3 bg-slate-900/70 rounded-lg border border-slate-800 p-4 flex flex-col min-h-0">
                <h2 className="text-lg font-bold text-white mb-4">1. Story Elements</h2>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    <textarea
                        name="idea"
                        value={storyElements.idea}
                        onChange={handleInputChange}
                        placeholder="Start with your core idea, e.g., 'A detective falls in love with a ghost he's investigating.'"
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-3 text-sm text-slate-200 placeholder-slate-500 h-32 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    />
                    <input
                        type="text"
                        name="theme"
                        value={storyElements.theme}
                        onChange={handleInputChange}
                        placeholder="Optional: What is the theme? e.g., 'Redemption'"
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-3 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    />
                     <div className="mb-[-10px]"><InputSelect name="tone" label="Tone" value={storyElements.tone} onChange={handleInputChange} options={SELECT_OPTIONS_CONFIG.tone} /></div>
                    <div className="flex gap-2">
                      <button onClick={handleAnalyzeIdea} disabled={isAnalyzing || !storyElements.idea.trim()} className="flex-grow text-white font-semibold text-sm py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                          {isAnalyzing ? <SpinnerIcon /> : <WandIcon />}
                          {isAnalyzing ? 'Analyzing...' : 'Analyze Idea'}
                      </button>
                      <IconButton tooltip="Randomize Elements (except idea & theme)" onClick={handleRandomize}>
                        <DiceIcon />
                      </IconButton>
                    </div>

                    {generatedTags.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Refine with Tags:</h3>
                            <div className="flex flex-wrap gap-2">
                                {generatedTags.map(tag => (
                                    <button 
                                      key={tag}
                                      onClick={() => handleTagToggle(tag)}
                                      className={`px-3 py-1 text-xs rounded-full transition-all duration-150 ${selectedTags.includes(tag) ? 'bg-cyan-500 text-white shadow-md ring-2 ring-cyan-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <InputSelect name="genre" label="Genre" value={storyElements.genre} onChange={handleInputChange} options={SELECT_OPTIONS_CONFIG.genre} />
                    <InputSelect name="characterDemographic" label="Character Demographic" value={storyElements.characterDemographic} onChange={handleInputChange} options={SELECT_OPTIONS_CONFIG.characterDemographic} />
                    <InputSelect name="characterArchetype" label="Character Archetype" value={storyElements.characterArchetype} onChange={handleInputChange} options={SELECT_OPTIONS_CONFIG.characterArchetype} />
                    <InputSelect name="locationSpecific" label="Setting Specifics" value={storyElements.locationSpecific} onChange={handleInputChange} options={SELECT_OPTIONS_CONFIG.locationSpecific} />
                </div>
                <div className="mt-auto pt-6">
                    <button onClick={handleGenerateLoglines} disabled={isGenerating || !storyElements.idea.trim()} className="w-full text-white font-bold py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-md">
                        {isGenerating ? <SpinnerIcon /> : <SparklesIcon className="w-5 h-5"/>}
                        {isGenerating ? 'Generating Loglines...' : '2. Generate Loglines'}
                    </button>
                </div>
            </div>

            {/* Column 2: Generated Loglines */}
            <div className="lg:col-span-5 bg-slate-900/70 rounded-lg border border-slate-800 p-4 flex flex-col min-h-0">
                <h2 className="text-lg font-bold text-white mb-4">3. Generated Loglines <span className="text-sm text-slate-400 font-normal">(Select one)</span></h2>
                <div className="flex-grow space-y-3 pr-2 overflow-y-auto custom-scrollbar">
                    {isGenerating && loglineSuggestions.length === 0 && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                    {!isGenerating && loglineSuggestions.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8 rounded-md bg-slate-800/30">
                            <SparklesIcon className="w-12 h-12 mb-4 text-slate-600"/>
                            <p className="font-semibold text-slate-400">Your logline magic happens here!</p>
                            <p className="text-sm">Fill in story elements and click "Generate Loglines".</p>
                        </div>
                    )}
                    {loglineSuggestions.map((logline, index) => (
                        <div key={index} onClick={() => handleSelectLogline(logline)} className={`p-4 rounded-lg border-2 bg-slate-800/60 hover:border-cyan-500/70 cursor-pointer transition-all duration-200 text-sm text-slate-300 hover:bg-slate-800 ${selectedLogline === logline ? 'border-cyan-500 bg-slate-800 ring-2 ring-cyan-500/50 shadow-lg' : 'border-slate-700 hover:border-slate-600'}`}>
                            <p>{logline}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Column 3: Optimized Content */}
            <div className="lg:col-span-4 bg-slate-900/70 rounded-lg border border-slate-800 p-4 flex flex-col min-h-0">
                <h2 className="text-lg font-bold text-white mb-4">4. Adapted Content</h2>
                <div className="flex-grow space-y-4 pr-2 overflow-y-auto custom-scrollbar">
                    {!selectedLogline ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8 rounded-md bg-slate-800/30">
                            <PaperclipIcon className="w-12 h-12 mb-4 text-slate-600" />
                            <p className="font-semibold text-slate-400">Select a logline to see it adapted.</p>
                            <p className="text-sm">Content for different platforms will appear here.</p>
                        </div>
                    ) : (
                        Object.values(outputFields).map(field => (
                            <div key={field.id}>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">{field.label}</label>
                                <div className="relative">
                                    <textarea readOnly value={field.isLoading ? '' : field.value} placeholder={field.isLoading ? 'Generating...' : field.placeholder} rows={field.rows} className="w-full bg-slate-800 border border-slate-700 rounded-md p-3 pr-10 text-sm text-slate-200 placeholder-slate-500 resize-none custom-scrollbar focus:ring-1 focus:ring-cyan-600 focus:border-cyan-600" />
                                    {field.isLoading && <div className="absolute top-3 right-3 text-slate-500"><SpinnerIcon/></div>}
                                    {!field.isLoading && field.value && !field.value.startsWith("Content generation for") && (
                                      <div className="absolute top-1.5 right-1.5">
                                          <IconButton tooltip={copiedState[field.id] ? "Copied!" : "Copy"} onClick={() => handleCopy(field.value, field.id)}>
                                            {copiedState[field.id] ? <CheckIcon /> : <ClipboardIcon />}
                                          </IconButton>
                                      </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
        
        <footer className="text-center py-4 mt-4 text-slate-500 text-xs shrink-0">
            {error && (
                <div role="alert" className="inline-block bg-red-900/60 border border-red-700 text-red-300 px-4 py-2.5 rounded-md mb-4 text-sm shadow-lg">
                    <strong>Error:</strong> {error}
                    <button onClick={() => setError(null)} className="ml-4 font-bold text-red-200 hover:text-white transition-colors">DISMISS</button>
                </div>
            )}
            <p>Powered by Google Gemini. For demonstration and educational purposes only.</p>
            <p>&copy; {new Date().getFullYear()} Logliner AI. All rights reserved (not really, it's a demo).</p>
        </footer>
      </div>
  );
};

export default App;