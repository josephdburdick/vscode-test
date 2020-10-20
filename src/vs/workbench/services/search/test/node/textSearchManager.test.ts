/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { URI } from 'vs/bAse/common/uri';
import { Progress } from 'vs/plAtform/progress/common/progress';
import { ITextQuery, QueryType } from 'vs/workbench/services/seArch/common/seArch';
import { ProviderResult, TextSeArchComplete, TextSeArchOptions, TextSeArchProvider, TextSeArchQuery, TextSeArchResult } from 'vs/workbench/services/seArch/common/seArchExtTypes';
import { NAtiveTextSeArchMAnAger } from 'vs/workbench/services/seArch/node/textSeArchMAnAger';

suite('NAtiveTextSeArchMAnAger', () => {
	test('fixes encoding', Async () => {
		let correctEncoding = fAlse;
		const provider: TextSeArchProvider = {
			provideTextSeArchResults(query: TextSeArchQuery, options: TextSeArchOptions, progress: Progress<TextSeArchResult>, token: CAncellAtionToken): ProviderResult<TextSeArchComplete> {
				correctEncoding = options.encoding === 'windows-1252';

				return null;
			}
		};

		const query: ITextQuery = {
			type: QueryType.Text,
			contentPAttern: {
				pAttern: 'A'
			},
			folderQueries: [{
				folder: URI.file('/some/folder'),
				fileEncoding: 'windows1252'
			}]
		};

		const m = new NAtiveTextSeArchMAnAger(query, provider);
		AwAit m.seArch(() => { }, new CAncellAtionTokenSource().token);

		Assert.ok(correctEncoding);
	});
});
