// src\app\change-lyrics\test.ts
/// <reference types="jest" />
import { handleReplaceAll, countChangedWords, LyricLine } from './utils';

describe('Lyrics Change Integration Test', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('handleReplaceAll', () => {
        it('should replace all instances of "nah," with "yah" in English lyrics and update markedText', () => {
            const initialLyrics = [
                { id: 35, original: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", modified: "Hey, nah, nah, nah, nah, nah, nah, nah, nah", wordChanges: [] },
            ];

            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            // Execute the function under test
            handleReplaceAll('nah,', 'yah', setLyricsMock, setFormValuesMock);

            // Verify the results
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);

            expect(updatedLyrics[0].modified).toBe("Hey, yah, yah, yah, yah, yah, yah, yah, yah");

            expect(updatedLyrics[0].markedText).toBe(
                `Hey, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>, <span class="text-red-600">yah</span>`
            );

            expect(countChangedWords(updatedLyrics[0])).toBe(8);

            const totalChangedWords = updatedLyrics.reduce((total: number, line: LyricLine) => total + countChangedWords(line), 0);
            expect(totalChangedWords).toBe(8);

            const updatedFormValues = setFormValuesMock.mock.calls[0][0]({ songUrl: '', lyrics: '' });
            expect(updatedFormValues.lyrics).toBe(
                "Hey, yah, yah, yah, yah, yah, yah, yah, yah"
            );
        });
        //
        it('should replace all instances of "hungry" with "horny" in English lyrics and update markedText', () => {
            const initialLyrics = [
                { id: 36, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' hungry, I'm stayin' hungry", wordChanges: [] },
                { id: 37, original: "I'm stayin' hungry, I'm stayin' hungry", modified: "I'm stayin' hungry, I'm stayin' hungry", wordChanges: [] },
                { id: 38, original: "Not gettin' angry, I'm stayin' hungry", modified: "Not gettin' angry, I'm stayin' hungry", wordChanges: [] },
                { id: 39, original: "Not gettin' angry, still stayin' hungry", modified: "Not gettin' angry, still stayin' hungry", wordChanges: [] },
            ];

            const setLyricsMock = jest.fn();
            const setFormValuesMock = jest.fn();

            // Execute the function under test
            handleReplaceAll('hungry', 'horny', setLyricsMock, setFormValuesMock);

            // Verify the results
            const updatedLyrics = setLyricsMock.mock.calls[0][0](initialLyrics);

            expect(updatedLyrics[0].modified).toBe("I'm stayin' horny, I'm stayin' horny");
            expect(updatedLyrics[1].modified).toBe("I'm stayin' horny, I'm stayin' horny");
            expect(updatedLyrics[2].modified).toBe("Not gettin' angry, I'm stayin' horny");
            expect(updatedLyrics[3].modified).toBe("Not gettin' angry, still stayin' horny");

            expect(updatedLyrics[0].markedText).toBe(
                `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`
            );
            expect(updatedLyrics[1].markedText).toBe(
                `I'm stayin' <span class="text-red-600">horny</span>, I'm stayin' <span class="text-red-600">horny</span>`
            );
            expect(updatedLyrics[2].markedText).toBe(
                `Not gettin' angry, I'm stayin' <span class="text-red-600">horny</span>`
            );
            expect(updatedLyrics[3].markedText).toBe(
                `Not gettin' angry, still stayin' <span class="text-red-600">horny</span>`
            );

            expect(countChangedWords(updatedLyrics[0])).toBe(2);
            expect(countChangedWords(updatedLyrics[1])).toBe(2);
            expect(countChangedWords(updatedLyrics[2])).toBe(1);
            expect(countChangedWords(updatedLyrics[3])).toBe(1);

            const totalChangedWords = updatedLyrics.reduce((total: number, line: LyricLine) => total + countChangedWords(line), 0);
            expect(totalChangedWords).toBe(6);

            const updatedFormValues = setFormValuesMock.mock.calls[0][0]({ songUrl: '', lyrics: '' });
            expect(updatedFormValues.lyrics).toBe(
                "I'm stayin' horny, I'm stayin' horny\n" +
                "I'm stayin' horny, I'm stayin' horny\n" +
                "Not gettin' angry, I'm stayin' horny\n" +
                "Not gettin' angry, still stayin' horny"
            );
        });
    });
});