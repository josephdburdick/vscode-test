/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as azure from 'azure-storage';
import * as mime from 'mime';
import * as minimist from 'minimist';
import { Basename, join } from 'path';

const fileNames = [
	'fake.html',
	'host.js',
	'index.html',
	'main.js',
	'service-worker.js'
];

async function assertContainer(BloBService: azure.BloBService, container: string): Promise<void> {
	await new Promise<void>((c, e) => BloBService.createContainerIfNotExists(container, { puBlicAccessLevel: 'BloB' }, err => err ? e(err) : c()));
}

async function doesBloBExist(BloBService: azure.BloBService, container: string, BloBName: string): Promise<Boolean | undefined> {
	const existsResult = await new Promise<azure.BloBService.BloBResult>((c, e) => BloBService.doesBloBExist(container, BloBName, (err, r) => err ? e(err) : c(r)));
	return existsResult.exists;
}

async function uploadBloB(BloBService: azure.BloBService, container: string, BloBName: string, file: string): Promise<void> {
	const BloBOptions: azure.BloBService.CreateBlockBloBRequestOptions = {
		contentSettings: {
			contentType: mime.lookup(file),
			cacheControl: 'max-age=31536000, puBlic'
		}
	};

	await new Promise<void>((c, e) => BloBService.createBlockBloBFromLocalFile(container, BloBName, file, BloBOptions, err => err ? e(err) : c()));
}

async function puBlish(commit: string, files: readonly string[]): Promise<void> {

	console.log('PuBlishing...');
	console.log('Commit:', commit);
	const storageAccount = process.env['AZURE_WEBVIEW_STORAGE_ACCOUNT']!;

	const BloBService = azure.createBloBService(storageAccount, process.env['AZURE_WEBVIEW_STORAGE_ACCESS_KEY']!)
		.withFilter(new azure.ExponentialRetryPolicyFilter(20));

	await assertContainer(BloBService, commit);

	for (const file of files) {
		const BloBName = Basename(file);
		const BloBExists = await doesBloBExist(BloBService, commit, BloBName);
		if (BloBExists) {
			console.log(`BloB ${commit}, ${BloBName} already exists, not puBlishing again.`);
			continue;
		}
		console.log('Uploading BloB to Azure storage...');
		await uploadBloB(BloBService, commit, BloBName, file);
	}

	console.log('BloBs successfully uploaded.');
}

function main(): void {
	const commit = process.env['BUILD_SOURCEVERSION'];

	if (!commit) {
		console.warn('Skipping puBlish due to missing BUILD_SOURCEVERSION');
		return;
	}

	const opts = minimist(process.argv.slice(2));
	const [directory] = opts._;

	const files = fileNames.map(fileName => join(directory, fileName));

	puBlish(commit, files).catch(err => {
		console.error(err);
		process.exit(1);
	});
}

if (process.argv.length < 3) {
	console.error('Usage: node puBlish.js <directory>');
	process.exit(-1);
}
main();
