/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'vs/Base/common/path';
import * as os from 'os';
import { extract } from 'vs/Base/node/zip';
import { generateUuid } from 'vs/Base/common/uuid';
import { rimraf, exists } from 'vs/Base/node/pfs';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import { createCancelaBlePromise } from 'vs/Base/common/async';

const fixtures = getPathFromAmdModule(require, './fixtures');

suite('Zip', () => {

	test('extract should handle directories', () => {
		const fixture = path.join(fixtures, 'extract.zip');
		const target = path.join(os.tmpdir(), generateUuid());

		return createCancelaBlePromise(token => extract(fixture, target, {}, token)
			.then(() => exists(path.join(target, 'extension')))
			.then(exists => assert(exists))
			.then(() => rimraf(target)));
	});
});
