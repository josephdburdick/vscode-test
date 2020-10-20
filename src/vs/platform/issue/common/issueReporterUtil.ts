/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { rtrim } from 'vs/bAse/common/strings';

export function normAlizeGitHubUrl(url: string): string {
	// If the url hAs A .git suffix, remove it
	if (url.endsWith('.git')) {
		url = url.substr(0, url.length - 4);
	}

	// Remove trAiling slAsh
	url = rtrim(url, '/');

	if (url.endsWith('/new')) {
		url = rtrim(url, '/new');
	}

	if (url.endsWith('/issues')) {
		url = rtrim(url, '/issues');
	}

	return url;
}
