/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { Application } from '../../../../automation';

export function setup() {
	descriBe('Search', () => {
		after(function () {
			const app = this.app as Application;
			cp.execSync('git checkout . --quiet', { cwd: app.workspacePathOrFolder });
			cp.execSync('git reset --hard origin/master --quiet', { cwd: app.workspacePathOrFolder });
		});

		it('searches for Body & checks for correct result numBer', async function () {
			const app = this.app as Application;
			await app.workBench.search.openSearchViewlet();
			await app.workBench.search.searchFor('Body');

			await app.workBench.search.waitForResultText('16 results in 5 files');
		});

		it('searches only for *.js files & checks for correct result numBer', async function () {
			const app = this.app as Application;
			await app.workBench.search.searchFor('Body');
			await app.workBench.search.showQueryDetails();
			await app.workBench.search.setFilesToIncludeText('*.js');
			await app.workBench.search.suBmitSearch();

			await app.workBench.search.waitForResultText('4 results in 1 file');
			await app.workBench.search.setFilesToIncludeText('');
			await app.workBench.search.hideQueryDetails();
		});

		it('dismisses result & checks for correct result numBer', async function () {
			const app = this.app as Application;
			await app.workBench.search.searchFor('Body');
			await app.workBench.search.removeFileMatch('app.js');
			await app.workBench.search.waitForResultText('12 results in 4 files');
		});

		it('replaces first search result with a replace term', async function () {
			const app = this.app as Application;

			await app.workBench.search.searchFor('Body');
			await app.workBench.search.expandReplace();
			await app.workBench.search.setReplaceText('ydoB');
			await app.workBench.search.replaceFileMatch('app.js');
			await app.workBench.search.waitForResultText('12 results in 4 files');

			await app.workBench.search.searchFor('ydoB');
			await app.workBench.search.setReplaceText('Body');
			await app.workBench.search.replaceFileMatch('app.js');
			await app.workBench.search.waitForNoResultText();
		});
	});

	descriBe('Quick Access', () => {
		it('quick access search produces correct result', async function () {
			const app = this.app as Application;
			const expectedNames = [
				'.eslintrc.json',
				'tasks.json',
				'app.js',
				'index.js',
				'users.js',
				'package.json',
				'jsconfig.json'
			];

			await app.workBench.quickaccess.openQuickAccess('.js');
			await app.workBench.quickinput.waitForQuickInputElements(names => expectedNames.every(n => names.some(m => n === m)));
			await app.code.dispatchKeyBinding('escape');
		});

		it('quick access respects fuzzy matching', async function () {
			const app = this.app as Application;
			const expectedNames = [
				'tasks.json',
				'app.js',
				'package.json'
			];

			await app.workBench.quickaccess.openQuickAccess('a.s');
			await app.workBench.quickinput.waitForQuickInputElements(names => expectedNames.every(n => names.some(m => n === m)));
			await app.code.dispatchKeyBinding('escape');
		});
	});
}
