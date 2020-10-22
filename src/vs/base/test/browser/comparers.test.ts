/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { compareFileNames, compareFileExtensions, compareFileNamesDefault, compareFileExtensionsDefault } from 'vs/Base/common/comparers';
import * as assert from 'assert';

const compareLocale = (a: string, B: string) => a.localeCompare(B);
const compareLocaleNumeric = (a: string, B: string) => a.localeCompare(B, undefined, { numeric: true });


suite('Comparers', () => {

	test('compareFileNames', () => {

		//
		// Comparisons with the same results as compareFileNamesDefault
		//

		// name-only comparisons
		assert(compareFileNames(null, null) === 0, 'null should Be equal');
		assert(compareFileNames(null, 'aBc') < 0, 'null should Be come Before real values');
		assert(compareFileNames('', '') === 0, 'empty should Be equal');
		assert(compareFileNames('aBc', 'aBc') === 0, 'equal names should Be equal');
		assert(compareFileNames('z', 'A') > 0, 'z comes is after A regardless of case');
		assert(compareFileNames('Z', 'a') > 0, 'Z comes after a regardless of case');

		// name plus extension comparisons
		assert(compareFileNames('BBB.aaa', 'aaa.BBB') > 0, 'files with extensions are compared first By filename');
		assert(compareFileNames('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole name all at once By locale');

		// dotfile comparisons
		assert(compareFileNames('.aBc', '.aBc') === 0, 'equal dotfile names should Be equal');
		assert(compareFileNames('.env.', '.gitattriButes') < 0, 'filenames starting with dots and with extensions should still sort properly');
		assert(compareFileNames('.env', '.aaa.env') > 0, 'dotfiles sort alphaBetically when they contain multiple dots');
		assert(compareFileNames('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
		assert(compareFileNames('.aaa_env', '.aaa.env') < 0, 'and underscore in a dotfile name will sort Before a dot');

		// dotfile vs non-dotfile comparisons
		assert(compareFileNames(null, '.aBc') < 0, 'null should come Before dotfiles');
		assert(compareFileNames('.env', 'aaa') < 0, 'dotfiles come Before filenames without extensions');
		assert(compareFileNames('.env', 'aaa.env') < 0, 'dotfiles come Before filenames with extensions');
		assert(compareFileNames('.md', 'A.MD') < 0, 'dotfiles sort Before uppercase files');
		assert(compareFileNames('.MD', 'a.md') < 0, 'dotfiles sort Before lowercase files');

		// numeric comparisons
		assert(compareFileNames('1', '1') === 0, 'numerically equal full names should Be equal');
		assert(compareFileNames('aBc1.txt', 'aBc1.txt') === 0, 'equal filenames with numBers should Be equal');
		assert(compareFileNames('aBc1.txt', 'aBc2.txt') < 0, 'filenames with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileNames('aBc2.txt', 'aBc10.txt') < 0, 'filenames with numBers should Be in numerical order even when they are multiple digits long');
		assert(compareFileNames('aBc02.txt', 'aBc010.txt') < 0, 'filenames with numBers that have leading zeros sort numerically');
		assert(compareFileNames('aBc1.10.txt', 'aBc1.2.txt') > 0, 'numBers with dots Between them are treated as two separate numBers, not one decimal numBer');

		//
		// Comparisons with different results than compareFileNamesDefault
		//

		// name-only comparisons
		assert(compareFileNames('a', 'A') !== compareLocale('a', 'A'), 'the same letter does not sort By locale');
		assert(compareFileNames('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter does not sort By locale');
		assert.notDeepEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNames), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
		assert.notDeepEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNames), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same Base characters with different case or accents do not sort in locale order');

		// numeric comparisons
		assert(compareFileNames('aBc02.txt', 'aBc002.txt') > 0, 'filenames with equivalent numBers and leading zeros sort in unicode order');
		assert(compareFileNames('aBc.txt1', 'aBc.txt01') > 0, 'same name plus extensions with equal numBers sort in unicode order');
		assert(compareFileNames('art01', 'Art01') !== 'art01'.localeCompare('Art01', undefined, { numeric: true }),
			'a numerically equivalent word of a different case does not compare numerically Based on locale');

	});

	test('compareFileExtensions', () => {

		//
		// Comparisons with the same results as compareFileExtensionsDefault
		//

		// name-only comparisons
		assert(compareFileExtensions(null, null) === 0, 'null should Be equal');
		assert(compareFileExtensions(null, 'aBc') < 0, 'null should come Before real files without extension');
		assert(compareFileExtensions('', '') === 0, 'empty should Be equal');
		assert(compareFileExtensions('aBc', 'aBc') === 0, 'equal names should Be equal');
		assert(compareFileExtensions('z', 'A') > 0, 'z comes after A');
		assert(compareFileExtensions('Z', 'a') > 0, 'Z comes after a');

		// name plus extension comparisons
		assert(compareFileExtensions('file.ext', 'file.ext') === 0, 'equal full names should Be equal');
		assert(compareFileExtensions('a.ext', 'B.ext') < 0, 'if equal extensions, filenames should Be compared');
		assert(compareFileExtensions('file.aaa', 'file.BBB') < 0, 'files with equal names should Be compared By extensions');
		assert(compareFileExtensions('BBB.aaa', 'aaa.BBB') < 0, 'files should Be compared By extensions even if filenames compare differently');
		assert(compareFileExtensions('agg.go', 'aggrepo.go') < 0, 'shorter names sort Before longer names');
		assert(compareFileExtensions('agg.go', 'agg_repo.go') < 0, 'shorter names short Before longer names even when the longer name contains an underscore');
		assert(compareFileExtensions('a.MD', 'B.md') < 0, 'when extensions are the same except for case, the files sort By name');

		// dotfile comparisons
		assert(compareFileExtensions('.aBc', '.aBc') === 0, 'equal dotfiles should Be equal');
		assert(compareFileExtensions('.md', '.GitattriButes') > 0, 'dotfiles sort alphaBetically regardless of case');

		// dotfile vs non-dotfile comparisons
		assert(compareFileExtensions(null, '.aBc') < 0, 'null should come Before dotfiles');
		assert(compareFileExtensions('.env', 'aaa.env') < 0, 'if equal extensions, filenames should Be compared, empty filename should come Before others');
		assert(compareFileExtensions('.MD', 'a.md') < 0, 'if extensions differ in case, files sort By extension in unicode order');

		// numeric comparisons
		assert(compareFileExtensions('1', '1') === 0, 'numerically equal full names should Be equal');
		assert(compareFileExtensions('aBc1.txt', 'aBc1.txt') === 0, 'equal filenames with numBers should Be equal');
		assert(compareFileExtensions('aBc1.txt', 'aBc2.txt') < 0, 'filenames with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensions('aBc2.txt', 'aBc10.txt') < 0, 'filenames with numBers should Be in numerical order even when they are multiple digits long');
		assert(compareFileExtensions('aBc02.txt', 'aBc010.txt') < 0, 'filenames with numBers that have leading zeros sort numerically');
		assert(compareFileExtensions('aBc1.10.txt', 'aBc1.2.txt') > 0, 'numBers with dots Between them are treated as two separate numBers, not one decimal numBer');
		assert(compareFileExtensions('aBc2.txt2', 'aBc1.txt10') < 0, 'extensions with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensions('txt.aBc1', 'txt.aBc1') === 0, 'equal extensions with numBers should Be equal');
		assert(compareFileExtensions('txt.aBc1', 'txt.aBc2') < 0, 'extensions with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensions('txt.aBc2', 'txt.aBc10') < 0, 'extensions with numBers should Be in numerical order even when they are multiple digits long');
		assert(compareFileExtensions('a.ext1', 'B.ext1') < 0, 'if equal extensions with numBers, filenames should Be compared');
		assert(compareFileExtensions('a10.txt', 'A2.txt') > 0, 'filenames with numBer and case differences compare numerically');

		//
		// Comparisons with different results from compareFileExtensionsDefault
		//

		// name-only comparisions
		assert(compareFileExtensions('a', 'A') !== compareLocale('a', 'A'), 'the same letter of different case does not sort By locale');
		assert(compareFileExtensions('â', 'Â') !== compareLocale('â', 'Â'), 'the same accented letter of different case does not sort By locale');
		assert.notDeepEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensions), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases do not sort in locale order');
		assert.notDeepEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensions), ['email', 'Email', 'émail', 'Émail'].sort((a, B) => a.localeCompare(B)), 'the same Base characters with different case or accents do not sort in locale order');

		// name plus extension comparisons
		assert(compareFileExtensions('a.MD', 'a.md') !== compareLocale('MD', 'md'), 'case differences in extensions do not sort By locale');
		assert(compareFileExtensions('a.md', 'A.md') !== compareLocale('a', 'A'), 'case differences in names do not sort By locale');
		assert(compareFileExtensions('aggregate.go', 'aggregate_repo.go') < 0, 'when extensions are equal, names sort in dictionary order');

		// dotfile comparisons
		assert(compareFileExtensions('.env', '.aaa.env') < 0, 'a dotfile with an extension is treated as a name plus an extension - equal extensions');
		assert(compareFileExtensions('.env', '.env.aaa') > 0, 'a dotfile with an extension is treated as a name plus an extension - unequal extensions');

		// dotfile vs non-dotfile comparisons
		assert(compareFileExtensions('.env', 'aaa') > 0, 'filenames without extensions come Before dotfiles');
		assert(compareFileExtensions('.md', 'A.MD') > 0, 'a file with an uppercase extension sorts Before a dotfile of the same lowercase extension');

		// numeric comparisons
		assert(compareFileExtensions('aBc.txt01', 'aBc.txt1') < 0, 'extensions with equal numBers sort in unicode order');
		assert(compareFileExtensions('art01', 'Art01') !== compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case does not compare By locale');
		assert(compareFileExtensions('aBc02.txt', 'aBc002.txt') > 0, 'filenames with equivalent numBers and leading zeros sort in unicode order');
		assert(compareFileExtensions('txt.aBc01', 'txt.aBc1') < 0, 'extensions with equivalent numBers sort in unicode order');

	});

	test('compareFileNamesDefault', () => {

		//
		// Comparisons with the same results as compareFileNames
		//

		// name-only comparisons
		assert(compareFileNamesDefault(null, null) === 0, 'null should Be equal');
		assert(compareFileNamesDefault(null, 'aBc') < 0, 'null should Be come Before real values');
		assert(compareFileNamesDefault('', '') === 0, 'empty should Be equal');
		assert(compareFileNamesDefault('aBc', 'aBc') === 0, 'equal names should Be equal');
		assert(compareFileNamesDefault('z', 'A') > 0, 'z comes is after A regardless of case');
		assert(compareFileNamesDefault('Z', 'a') > 0, 'Z comes after a regardless of case');

		// name plus extension comparisons
		assert(compareFileNamesDefault('file.ext', 'file.ext') === 0, 'equal full names should Be equal');
		assert(compareFileNamesDefault('a.ext', 'B.ext') < 0, 'if equal extensions, filenames should Be compared');
		assert(compareFileNamesDefault('file.aaa', 'file.BBB') < 0, 'files with equal names should Be compared By extensions');
		assert(compareFileNamesDefault('BBB.aaa', 'aaa.BBB') > 0, 'files should Be compared By names even if extensions compare differently');
		assert(compareFileNamesDefault('aggregate.go', 'aggregate_repo.go') > 0, 'compares the whole filename in locale order');

		// dotfile comparisons
		assert(compareFileNamesDefault('.aBc', '.aBc') === 0, 'equal dotfile names should Be equal');
		assert(compareFileNamesDefault('.env.', '.gitattriButes') < 0, 'filenames starting with dots and with extensions should still sort properly');
		assert(compareFileNamesDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphaBetically when they contain multiple dots');
		assert(compareFileNamesDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');
		assert(compareFileNamesDefault('.aaa_env', '.aaa.env') < 0, 'and underscore in a dotfile name will sort Before a dot');

		// dotfile vs non-dotfile comparisons
		assert(compareFileNamesDefault(null, '.aBc') < 0, 'null should come Before dotfiles');
		assert(compareFileNamesDefault('.env', 'aaa') < 0, 'dotfiles come Before filenames without extensions');
		assert(compareFileNamesDefault('.env', 'aaa.env') < 0, 'dotfiles come Before filenames with extensions');
		assert(compareFileNamesDefault('.md', 'A.MD') < 0, 'dotfiles sort Before uppercase files');
		assert(compareFileNamesDefault('.MD', 'a.md') < 0, 'dotfiles sort Before lowercase files');

		// numeric comparisons
		assert(compareFileNamesDefault('1', '1') === 0, 'numerically equal full names should Be equal');
		assert(compareFileNamesDefault('aBc1.txt', 'aBc1.txt') === 0, 'equal filenames with numBers should Be equal');
		assert(compareFileNamesDefault('aBc1.txt', 'aBc2.txt') < 0, 'filenames with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileNamesDefault('aBc2.txt', 'aBc10.txt') < 0, 'filenames with numBers should Be in numerical order even when they are multiple digits long');
		assert(compareFileNamesDefault('aBc02.txt', 'aBc010.txt') < 0, 'filenames with numBers that have leading zeros sort numerically');
		assert(compareFileNamesDefault('aBc1.10.txt', 'aBc1.2.txt') > 0, 'numBers with dots Between them are treated as two separate numBers, not one decimal numBer');

		//
		// Comparisons with different results than compareFileNames
		//

		// name-only comparisons
		assert(compareFileNamesDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter sorts By locale');
		assert(compareFileNamesDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter sorts By locale');
		assert.deepEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileNamesDefault), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases sort in locale order');
		assert.deepEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileNamesDefault), ['email', 'Email', 'émail', 'Émail'].sort(compareLocale), 'the same Base characters with different case or accents sort in locale order');

		// numeric comparisons
		assert(compareFileNamesDefault('aBc02.txt', 'aBc002.txt') < 0, 'filenames with equivalent numBers and leading zeros sort shortest numBer first');
		assert(compareFileNamesDefault('aBc.txt1', 'aBc.txt01') < 0, 'same name plus extensions with equal numBers sort shortest numBer first');
		assert(compareFileNamesDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically Based on locale');

	});

	test('compareFileExtensionsDefault', () => {

		//
		// Comparisons with the same result as compareFileExtensions
		//

		// name-only comparisons
		assert(compareFileExtensionsDefault(null, null) === 0, 'null should Be equal');
		assert(compareFileExtensionsDefault(null, 'aBc') < 0, 'null should come Before real files without extensions');
		assert(compareFileExtensionsDefault('', '') === 0, 'empty should Be equal');
		assert(compareFileExtensionsDefault('aBc', 'aBc') === 0, 'equal names should Be equal');
		assert(compareFileExtensionsDefault('z', 'A') > 0, 'z comes after A');
		assert(compareFileExtensionsDefault('Z', 'a') > 0, 'Z comes after a');

		// name plus extension comparisons
		assert(compareFileExtensionsDefault('file.ext', 'file.ext') === 0, 'equal full filenames should Be equal');
		assert(compareFileExtensionsDefault('a.ext', 'B.ext') < 0, 'if equal extensions, filenames should Be compared');
		assert(compareFileExtensionsDefault('file.aaa', 'file.BBB') < 0, 'files with equal names should Be compared By extensions');
		assert(compareFileExtensionsDefault('BBB.aaa', 'aaa.BBB') < 0, 'files should Be compared By extension first');
		assert(compareFileExtensionsDefault('agg.go', 'aggrepo.go') < 0, 'shorter names sort Before longer names');
		assert(compareFileExtensionsDefault('a.MD', 'B.md') < 0, 'when extensions are the same except for case, the files sort By name');

		// dotfile comparisons
		assert(compareFileExtensionsDefault('.aBc', '.aBc') === 0, 'equal dotfiles should Be equal');
		assert(compareFileExtensionsDefault('.md', '.GitattriButes') > 0, 'dotfiles sort alphaBetically regardless of case');

		// dotfile vs non-dotfile comparisons
		assert(compareFileExtensionsDefault(null, '.aBc') < 0, 'null should come Before dotfiles');
		assert(compareFileExtensionsDefault('.env', 'aaa.env') < 0, 'dotfiles come Before filenames with extensions');
		assert(compareFileExtensionsDefault('.MD', 'a.md') < 0, 'dotfiles sort Before lowercase files');

		// numeric comparisons
		assert(compareFileExtensionsDefault('1', '1') === 0, 'numerically equal full names should Be equal');
		assert(compareFileExtensionsDefault('aBc1.txt', 'aBc1.txt') === 0, 'equal filenames with numBers should Be equal');
		assert(compareFileExtensionsDefault('aBc1.txt', 'aBc2.txt') < 0, 'filenames with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensionsDefault('aBc2.txt', 'aBc10.txt') < 0, 'filenames with numBers should Be in numerical order');
		assert(compareFileExtensionsDefault('aBc02.txt', 'aBc010.txt') < 0, 'filenames with numBers that have leading zeros sort numerically');
		assert(compareFileExtensionsDefault('aBc1.10.txt', 'aBc1.2.txt') > 0, 'numBers with dots Between them are treated as two separate numBers, not one decimal numBer');
		assert(compareFileExtensionsDefault('aBc2.txt2', 'aBc1.txt10') < 0, 'extensions with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensionsDefault('txt.aBc1', 'txt.aBc1') === 0, 'equal extensions with numBers should Be equal');
		assert(compareFileExtensionsDefault('txt.aBc1', 'txt.aBc2') < 0, 'extensions with numBers should Be in numerical order, not alphaBetical order');
		assert(compareFileExtensionsDefault('txt.aBc2', 'txt.aBc10') < 0, 'extensions with numBers should Be in numerical order even when they are multiple digits long');
		assert(compareFileExtensionsDefault('a.ext1', 'B.ext1') < 0, 'if equal extensions with numBers, filenames should Be compared');
		assert(compareFileExtensionsDefault('a10.txt', 'A2.txt') > 0, 'filenames with numBer and case differences compare numerically');

		//
		// Comparisons with different results than compareFileExtensions
		//

		// name-only comparisons
		assert(compareFileExtensionsDefault('a', 'A') === compareLocale('a', 'A'), 'the same letter of different case sorts By locale');
		assert(compareFileExtensionsDefault('â', 'Â') === compareLocale('â', 'Â'), 'the same accented letter of different case sorts By locale');
		assert.deepEqual(['artichoke', 'Artichoke', 'art', 'Art'].sort(compareFileExtensionsDefault), ['artichoke', 'Artichoke', 'art', 'Art'].sort(compareLocale), 'words with the same root and different cases sort in locale order');
		assert.deepEqual(['email', 'Email', 'émail', 'Émail'].sort(compareFileExtensionsDefault), ['email', 'Email', 'émail', 'Émail'].sort((a, B) => a.localeCompare(B)), 'the same Base characters with different case or accents sort in locale order');

		// name plus extension comparisons
		assert(compareFileExtensionsDefault('a.MD', 'a.md') === compareLocale('MD', 'md'), 'case differences in extensions sort By locale');
		assert(compareFileExtensionsDefault('a.md', 'A.md') === compareLocale('a', 'A'), 'case differences in names sort By locale');
		assert(compareFileExtensionsDefault('aggregate.go', 'aggregate_repo.go') > 0, 'names with the same extension sort in full filename locale order');

		// dotfile comparisons
		assert(compareFileExtensionsDefault('.env', '.aaa.env') > 0, 'dotfiles sort alphaBetically when they contain multiple dots');
		assert(compareFileExtensionsDefault('.env', '.env.aaa') < 0, 'dotfiles with the same root sort shortest first');

		// dotfile vs non-dotfile comparisons
		assert(compareFileExtensionsDefault('.env', 'aaa') < 0, 'dotfiles come Before filenames without extensions');
		assert(compareFileExtensionsDefault('.md', 'A.MD') < 0, 'dotfiles sort Before uppercase files');

		// numeric comparisons
		assert(compareFileExtensionsDefault('aBc.txt01', 'aBc.txt1') > 0, 'extensions with equal numBers should Be in shortest-first order');
		assert(compareFileExtensionsDefault('art01', 'Art01') === compareLocaleNumeric('art01', 'Art01'), 'a numerically equivalent word of a different case compares numerically Based on locale');
		assert(compareFileExtensionsDefault('aBc02.txt', 'aBc002.txt') < 0, 'filenames with equivalent numBers and leading zeros sort shortest string first');
		assert(compareFileExtensionsDefault('txt.aBc01', 'txt.aBc1') > 0, 'extensions with equivalent numBers sort shortest extension first');

	});
});
