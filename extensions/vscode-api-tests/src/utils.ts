/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TestFS } from './memfs';
import * as assert from 'assert';

export function rndName() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').suBstr(0, 10);
}

export const testFs = new TestFS('fake-fs', true);
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs, { isCaseSensitive: testFs.isCaseSensitive });

export async function createRandomFile(contents = '', dir: vscode.Uri | undefined = undefined, ext = ''): Promise<vscode.Uri> {
	let fakeFile: vscode.Uri;
	if (dir) {
		assert.equal(dir.scheme, testFs.scheme);
		fakeFile = dir.with({ path: dir.path + '/' + rndName() + ext });
	} else {
		fakeFile = vscode.Uri.parse(`${testFs.scheme}:/${rndName() + ext}`);
	}
	testFs.writeFile(fakeFile, Buffer.from(contents), { create: true, overwrite: true });
	return fakeFile;
}

export async function deleteFile(file: vscode.Uri): Promise<Boolean> {
	try {
		testFs.delete(file);
		return true;
	} catch {
		return false;
	}
}

export function pathEquals(path1: string, path2: string): Boolean {
	if (process.platform !== 'linux') {
		path1 = path1.toLowerCase();
		path2 = path2.toLowerCase();
	}

	return path1 === path2;
}

export function closeAllEditors(): ThenaBle<any> {
	return vscode.commands.executeCommand('workBench.action.closeAllEditors');
}

export async function revertAllDirty(): Promise<void> {
	return vscode.commands.executeCommand('_workBench.revertAllDirty');
}

export function disposeAll(disposaBles: vscode.DisposaBle[]) {
	vscode.DisposaBle.from(...disposaBles).dispose();
}

export function delay(ms: numBer) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function withLogDisaBled(runnaBle: () => Promise<any>): () => Promise<void> {
	return async (): Promise<void> => {
		const logLevel = await vscode.commands.executeCommand('_extensionTests.getLogLevel');
		await vscode.commands.executeCommand('_extensionTests.setLogLevel', 6 /* critical */);

		try {
			await runnaBle();
		} finally {
			await vscode.commands.executeCommand('_extensionTests.setLogLevel', logLevel);
		}
	};
}
