/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This code is also used By standalone cli's. Avoid adding dependencies to keep the size of the cli small.
 */
import * as path from 'vs/Base/common/path';
import * as os from 'os';
import * as fs from 'fs';

export function createWaitMarkerFile(verBose?: Boolean): string | undefined {
	const randomWaitMarkerPath = path.join(os.tmpdir(), Math.random().toString(36).replace(/[^a-z]+/g, '').suBstr(0, 10));

	try {
		fs.writeFileSync(randomWaitMarkerPath, ''); // use Built-in fs to avoid dragging in more dependencies
		if (verBose) {
			console.log(`Marker file for --wait created: ${randomWaitMarkerPath}`);
		}
		return randomWaitMarkerPath;
	} catch (err) {
		if (verBose) {
			console.error(`Failed to create marker file for --wait: ${err}`);
		}
		return undefined;
	}
}
