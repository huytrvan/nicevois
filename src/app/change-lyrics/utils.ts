// src\app\change-lyrics\utils.ts
import { diffWords } from 'diff';
import { toast as sonnerToast } from 'sonner'; // Import toast type from sonner

export interface FormValues {
    songUrl: string;
    lyrics: string;
}

export interface WordChange {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
    isTransformation?: boolean;
}

export type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Updated function to use diff library
export function calculateWordChanges(original: string, modified: string): WordChange[] {
    // Normalize texts
    const normalizeText = (text: string) => {
        return text.replace(/[\n\r]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    };

    const normalizedOriginal = normalizeText(original || '');
    const normalizedModified = normalizeText(modified || '');

    // If texts are identical, return empty array
    if (normalizedOriginal === normalizedModified) {
        return [];
    }

    // Split into words
    const originalWords = normalizedOriginal.split(/\s+/).filter(word => word.length > 0);
    const modifiedWords = normalizedModified.split(/\s+/).filter(word => word.length > 0);

    if (originalWords.length === 0 && modifiedWords.length === 0) {
        return [];
    }

    // Use the diff library to calculate differences
    const differences = diffWords(normalizedOriginal, normalizedModified);

    // Process differences to create WordChange objects
    const changes: WordChange[] = [];
    let origIndex = 0;
    let modIndex = 0;

    differences.forEach(part => {
        const words = part.value.trim().split(/\s+/).filter(word => word.length > 0);

        if (words.length === 0) return;

        if (part.added) {
            // Words were added
            words.forEach(word => {
                changes.push({
                    originalWord: '',
                    newWord: word,
                    originalIndex: origIndex,
                    newIndex: modIndex,
                    hasChanged: true
                });
                modIndex++;
            });
        } else if (part.removed) {
            // Words were removed
            words.forEach(word => {
                changes.push({
                    originalWord: word,
                    newWord: '',
                    originalIndex: origIndex,
                    newIndex: modIndex,
                    hasChanged: true
                });
                origIndex++;
            });
        } else {
            // Unchanged words
            words.forEach(word => {
                changes.push({
                    originalWord: word,
                    newWord: word,
                    originalIndex: origIndex,
                    newIndex: modIndex,
                    hasChanged: false
                });
                origIndex++;
                modIndex++;
            });
        }
    });

    // Merge consecutive removal and addition into substitution
    const mergedChanges: WordChange[] = [];
    let i = 0;
    while (i < changes.length) {
        if (i < changes.length - 1 &&
            changes[i].hasChanged && changes[i].newWord === '' && // removal
            changes[i + 1].hasChanged && changes[i + 1].originalWord === '' && // addition
            changes[i].newIndex === changes[i + 1].newIndex) {
            // Merge into substitution
            const substitution = {
                originalWord: changes[i].originalWord,
                newWord: changes[i + 1].newWord,
                originalIndex: changes[i].originalIndex,
                newIndex: changes[i + 1].newIndex,
                hasChanged: true,
                isTransformation: false // Set in handleReplaceAll
            };
            mergedChanges.push(substitution);
            i += 2;
        } else {
            mergedChanges.push(changes[i]);
            i++;
        }
    }

    // Special case for punctuation changes
    for (let i = 0; i < mergedChanges.length; i++) {
        const change = mergedChanges[i];
        if (change.hasChanged && change.originalWord && change.newWord) {
            const originalWithoutPunctuation = change.originalWord.replace(/[.,()[\]{}:;!?-]+/g, '').toLowerCase();
            const newWithoutPunctuation = change.newWord.replace(/[.,()[\]{}:;!?-]+/g, '').toLowerCase();

            // If only punctuation differs, mark as unchanged
            if (originalWithoutPunctuation === newWithoutPunctuation && originalWithoutPunctuation.length > 0) {
                mergedChanges[i] = {
                    ...change,
                    hasChanged: false
                };
            }
        }
    }

    return mergedChanges;
}

export function generateLyricsData(text: string): LyricLine[] {
    // Remove leading/trailing newlines and normalize line endings
    const cleanedText = text.replace(/^[\n\r]+|[\n\r]+$/g, '').replace(/\r\n|\r/g, '\n');
    const lines = cleanedText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map((line, index) => ({
            id: index + 1,
            text: line.trim(),
            original: line.trim(),
            modified: line.trim(),
            wordChanges: [],
        }));
    return lines;
}

export function generateMarkedText(
    original: string,
    modified: string,
    wordChanges: WordChange[]
): string {
    const diffs = diffWords(original, modified);

    // build sets of _base_ words (punctuation stripped) that were transformations
    const transformedNew = new Set(
        wordChanges
            .filter(c => c.isTransformation)
            .map(c => c.newWord.replace(/[.,!?;:]+$/, ''))
    );
    const transformedOrig = new Set(
        wordChanges
            .filter(c => c.isTransformation)
            .map(c => c.originalWord.replace(/[.,!?;:]+$/, ''))
    );

    let out = '';

    diffs.forEach(part => {
        if (part.added) {
            // break into words / whitespace / punctuation
            const tokens = part.value.match(/(\w+(?:'\w+)*)|(\s+)|([.,!?;:]+)/g)!;
            tokens.forEach(tok => {
                const base = tok.replace(/[.,!?;:]+$/, '');
                if (transformedNew.has(base)) {
                    out += `<span class="text-red-600">${base}</span>`;
                } else {
                    out += tok;
                }
            });

        } else if (part.removed) {
            const tokens = part.value.match(/(\w+(?:'\w+)*)|(\s+)|([.,!?;:]+)/g)!;
            tokens.forEach(tok => {
                // skip whitespace & punctuation
                if (/^\s+$/.test(tok) || /^[.,!?;:]+$/.test(tok)) return;
                const base = tok.replace(/[.,!?;:]+$/, '');
                // skip deletion‑marker if it was part of a transform
                if (transformedOrig.has(base)) return;
                out += `<span class="text-red-600">⌧</span>`;
            });

        } else {
            out += part.value;
        }
    });

    return out;
}

// Calculate total word changes
export function countChangedWords(line: LyricLine): number {
    let changedWordCount = 0;

    // Track positions to avoid double-counting
    const countedOriginalPositions = new Set<number>();

    // Process each change in the line
    line.wordChanges.forEach(change => {
        if (!change.hasChanged) return; // Skip unchanged words

        if (change.originalWord && change.newWord) {
            // Substitution: Count only if this original position hasn't been counted
            if (!countedOriginalPositions.has(change.originalIndex)) {
                changedWordCount++;
                countedOriginalPositions.add(change.originalIndex);
            }
        } else if (change.originalWord && !change.newWord) {
            // Deletion: Always count, using originalIndex to track
            if (!countedOriginalPositions.has(change.originalIndex)) {
                changedWordCount++;
                countedOriginalPositions.add(change.originalIndex);
            }
        } else if (!change.originalWord && change.newWord) {
            // Insertion: Each insertion is a separate change
            changedWordCount++;
            // No need to track position for insertions
        }
    });

    return changedWordCount;
}

// Improved stripHtmlAndSymbols function
export const stripHtmlAndSymbols = (text: string) => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;

    // Get plain text content
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Remove ⌧ symbols completely and trim excess spaces
    return plainText.replace(/⌧/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

export function handleLyricChange(
    id: number,
    newText: string,
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>
): void {
    setLyrics((prevLyrics: LyricLine[]) => {
        const updatedLyrics = prevLyrics.map((line: LyricLine) => {
            if (line.id !== id) return line;

            const sanitizedNewText = stripHtmlAndSymbols(newText);
            if (!sanitizedNewText.trim()) {
                return line;
            }

            const normalizedNewText = sanitizedNewText.replace(/\s{2,}/g, ' ').trim();
            const wordChanges = calculateWordChanges(line.original, normalizedNewText);
            const markedText = generateMarkedText(line.original, normalizedNewText, wordChanges);

            return {
                ...line,
                modified: normalizedNewText,
                markedText,
                wordChanges
            };
        });

        setFormValues((prev: FormValues) => ({
            ...prev,
            lyrics: updatedLyrics.map((line: LyricLine) => line.modified).join('\n')
        }));

        return updatedLyrics;
    });
}

export function handleReplaceAll(
    replaceTerm: string,
    replaceWith: string,
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>,
    toast?: typeof sonnerToast
): void {
    if (!replaceTerm.trim()) {
        toast?.error('Please enter a term to replace');
        return;
    }

    // Extract the base word and optional punctuation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [, termWord, termPunct = ''] = replaceTerm.match(/^(.+?)([.,!?;:]*)$/)!;

    // Create the regex to match the base word, with optional punctuation
    // Instead of requiring the punctuation in the match, we'll match the base word
    // and preserve any existing punctuation
    const findRegex = new RegExp(`\\b${escapeRegExp(termWord)}\\b`, 'gi');

    setLyrics(prevLyrics => {
        const updatedLyrics = prevLyrics.map(line => {
            if (!findRegex.test(line.modified)) return line;

            const newModified = line.modified.replace(findRegex, matched => {
                const base = matched.replace(/[.,!?;:]+$/, '');
                let replaced = replaceWith;

                // Preserve case
                if (base === base.toUpperCase()) {
                    replaced = replaceWith.toUpperCase();
                } else if (base === base.toLowerCase()) {
                    replaced = replaceWith.toLowerCase();
                } else if (base[0] === base[0].toUpperCase()) {
                    replaced = replaceWith[0].toUpperCase() + replaceWith.slice(1).toLowerCase();
                }

                // Preserve any punctuation that was in the matched word
                const punct = (matched.match(/[.,!?;:]+$/) || [''])[0];
                return replaced + punct;
            });

            const wordChanges = calculateWordChanges(line.original, newModified);
            const markedChanges = wordChanges.map(c => {
                const origBase = c.originalWord.replace(/[.,!?;:]+$/, '');
                const newBase = c.newWord.replace(/[.,!?;:]+$/, '');
                if (
                    c.hasChanged &&
                    origBase.toLowerCase() === termWord.toLowerCase() &&
                    newBase.toLowerCase() === replaceWith.toLowerCase()
                ) {
                    return { ...c, isTransformation: true };
                }
                return c;
            });

            const markedText = generateMarkedText(line.original, newModified, markedChanges);

            return {
                ...line,
                modified: newModified,
                wordChanges: markedChanges,
                markedText
            };
        });

        setFormValues(prev => ({
            ...prev,
            lyrics: updatedLyrics.map(line => line.modified).join('\n')
        }));

        return updatedLyrics;
    });

    toast?.success(`Replaced all instances of "${replaceTerm}" with "${replaceWith}"`);
}

export function handleResetLyrics(
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>,
    toast?: typeof sonnerToast // Optional toast parameter
): void {
    setLyrics((prevLyrics: LyricLine[]) => {
        const resetLyrics = prevLyrics.map((line: LyricLine) => ({
            ...line,
            modified: line.original,
            markedText: line.original,
            wordChanges: []
        }));
        setFormValues((prev: FormValues) => ({
            ...prev,
            lyrics: resetLyrics.map((line: LyricLine) => line.modified).join('\n')
        }));
        return resetLyrics;
    });

    toast?.success('Lyrics reset to original version'); // Optional chaining
}