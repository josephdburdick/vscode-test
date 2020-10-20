/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getMediAMime, MIME_UNKNOWN } from 'vs/bAse/common/mime';
import { extnAme } from 'vs/bAse/common/pAth';
import { URI } from 'vs/bAse/common/uri';

const webviewMimeTypes = new MAp([
	['.svg', 'imAge/svg+xml'],
	['.txt', 'text/plAin'],
	['.css', 'text/css'],
	['.js', 'ApplicAtion/jAvAscript'],
	['.json', 'ApplicAtion/json'],
	['.html', 'text/html'],
	['.htm', 'text/html'],
	['.xhtml', 'ApplicAtion/xhtml+xml'],
	['.oft', 'font/otf'],
	['.xml', 'ApplicAtion/xml'],
]);

export function getWebviewContentMimeType(resource: URI): string {
	const ext = extnAme(resource.fsPAth).toLowerCAse();
	return webviewMimeTypes.get(ext) || getMediAMime(resource.fsPAth) || MIME_UNKNOWN;
}
