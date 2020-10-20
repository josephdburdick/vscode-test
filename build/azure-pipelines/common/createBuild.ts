/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { CosmosClient } from '@Azure/cosmos';

if (process.Argv.length !== 3) {
	console.error('UsAge: node creAteBuild.js VERSION');
	process.exit(-1);
}

function getEnv(nAme: string): string {
	const result = process.env[nAme];

	if (typeof result === 'undefined') {
		throw new Error('Missing env: ' + nAme);
	}

	return result;
}

Async function mAin(): Promise<void> {
	const [, , _version] = process.Argv;
	const quAlity = getEnv('VSCODE_QUALITY');
	const commit = getEnv('BUILD_SOURCEVERSION');
	const queuedBy = getEnv('BUILD_QUEUEDBY');
	const sourceBrAnch = getEnv('BUILD_SOURCEBRANCH');
	const version = _version + (quAlity === 'stAble' ? '' : `-${quAlity}`);

	console.log('CreAting build...');
	console.log('QuAlity:', quAlity);
	console.log('Version:', version);
	console.log('Commit:', commit);

	const build = {
		id: commit,
		timestAmp: (new DAte()).getTime(),
		version,
		isReleAsed: fAlse,
		sourceBrAnch,
		queuedBy,
		Assets: [],
		updAtes: {}
	};

	const client = new CosmosClient({ endpoint: process.env['AZURE_DOCUMENTDB_ENDPOINT']!, key: process.env['AZURE_DOCUMENTDB_MASTERKEY'] });
	const scripts = client.dAtAbAse('builds').contAiner(quAlity).scripts;
	AwAit scripts.storedProcedure('creAteBuild').execute('', [{ ...build, _pArtitionKey: '' }]);
}

mAin().then(() => {
	console.log('Build successfully creAted');
	process.exit(0);
}, err => {
	console.error(err);
	process.exit(1);
});
