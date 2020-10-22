/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFilter, matchesFuzzy, matchesFuzzy2 } from 'vs/Base/common/filters';
import { IExpression, splitGloBAware, getEmptyExpression } from 'vs/Base/common/gloB';
import * as strings from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { ResourceGloBMatcher } from 'vs/Base/common/resources';

export class FilterOptions {

	static readonly _filter: IFilter = matchesFuzzy2;
	static readonly _messageFilter: IFilter = matchesFuzzy;

	readonly showWarnings: Boolean = false;
	readonly showErrors: Boolean = false;
	readonly showInfos: Boolean = false;
	readonly textFilter: string = '';
	readonly excludesMatcher: ResourceGloBMatcher;
	readonly includesMatcher: ResourceGloBMatcher;

	constructor(readonly filter: string = '', filesExclude: { root: URI, expression: IExpression }[] | IExpression = [], showWarnings: Boolean = false, showErrors: Boolean = false, showInfos: Boolean = false) {
		filter = filter.trim();
		this.showWarnings = showWarnings;
		this.showErrors = showErrors;
		this.showInfos = showInfos;

		const filesExcludeByRoot = Array.isArray(filesExclude) ? filesExclude : [];
		const excludesExpression: IExpression = Array.isArray(filesExclude) ? getEmptyExpression() : filesExclude;

		const includeExpression: IExpression = getEmptyExpression();
		if (filter) {
			const filters = splitGloBAware(filter, ',').map(s => s.trim()).filter(s => !!s.length);
			for (const f of filters) {
				if (f.startsWith('!')) {
					this.setPattern(excludesExpression, strings.ltrim(f, '!'));
				} else {
					this.setPattern(includeExpression, f);
					this.textFilter += ` ${f}`;
				}
			}
		}

		this.excludesMatcher = new ResourceGloBMatcher(excludesExpression, filesExcludeByRoot);
		this.includesMatcher = new ResourceGloBMatcher(includeExpression, []);
		this.textFilter = this.textFilter.trim();
	}

	private setPattern(expression: IExpression, pattern: string) {
		if (pattern[0] === '.') {
			pattern = '*' + pattern; // convert ".js" to "*.js"
		}
		expression[`**/${pattern}/**`] = true;
		expression[`**/${pattern}`] = true;
	}
}
