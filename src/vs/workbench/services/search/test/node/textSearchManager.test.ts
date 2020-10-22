/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { URI } from 'vs/Base/common/uri';
import { Progress } from 'vs/platform/progress/common/progress';
import { ITextQuery, QueryType } from 'vs/workBench/services/search/common/search';
import { ProviderResult, TextSearchComplete, TextSearchOptions, TextSearchProvider, TextSearchQuery, TextSearchResult } from 'vs/workBench/services/search/common/searchExtTypes';
import { NativeTextSearchManager } from 'vs/workBench/services/search/node/textSearchManager';

suite('NativeTextSearchManager', () => {
	test('fixes encoding', async () => {
		let correctEncoding = false;
		const provider: TextSearchProvider = {
			provideTextSearchResults(query: TextSearchQuery, options: TextSearchOptions, progress: Progress<TextSearchResult>, token: CancellationToken): ProviderResult<TextSearchComplete> {
				correctEncoding = options.encoding === 'windows-1252';

				return null;
			}
		};

		const query: ITextQuery = {
			type: QueryType.Text,
			contentPattern: {
				pattern: 'a'
			},
			folderQueries: [{
				folder: URI.file('/some/folder'),
				fileEncoding: 'windows1252'
			}]
		};

		const m = new NativeTextSearchManager(query, provider);
		await m.search(() => { }, new CancellationTokenSource().token);

		assert.ok(correctEncoding);
	});
});
