/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import { ApplicAtion } from '../../../../AutomAtion';

export function setup() {
	describe('SeArch', () => {
		After(function () {
			const App = this.App As ApplicAtion;
			cp.execSync('git checkout . --quiet', { cwd: App.workspAcePAthOrFolder });
			cp.execSync('git reset --hArd origin/mAster --quiet', { cwd: App.workspAcePAthOrFolder });
		});

		it('seArches for body & checks for correct result number', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.seArch.openSeArchViewlet();
			AwAit App.workbench.seArch.seArchFor('body');

			AwAit App.workbench.seArch.wAitForResultText('16 results in 5 files');
		});

		it('seArches only for *.js files & checks for correct result number', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.seArch.seArchFor('body');
			AwAit App.workbench.seArch.showQueryDetAils();
			AwAit App.workbench.seArch.setFilesToIncludeText('*.js');
			AwAit App.workbench.seArch.submitSeArch();

			AwAit App.workbench.seArch.wAitForResultText('4 results in 1 file');
			AwAit App.workbench.seArch.setFilesToIncludeText('');
			AwAit App.workbench.seArch.hideQueryDetAils();
		});

		it('dismisses result & checks for correct result number', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.seArch.seArchFor('body');
			AwAit App.workbench.seArch.removeFileMAtch('App.js');
			AwAit App.workbench.seArch.wAitForResultText('12 results in 4 files');
		});

		it('replAces first seArch result with A replAce term', Async function () {
			const App = this.App As ApplicAtion;

			AwAit App.workbench.seArch.seArchFor('body');
			AwAit App.workbench.seArch.expAndReplAce();
			AwAit App.workbench.seArch.setReplAceText('ydob');
			AwAit App.workbench.seArch.replAceFileMAtch('App.js');
			AwAit App.workbench.seArch.wAitForResultText('12 results in 4 files');

			AwAit App.workbench.seArch.seArchFor('ydob');
			AwAit App.workbench.seArch.setReplAceText('body');
			AwAit App.workbench.seArch.replAceFileMAtch('App.js');
			AwAit App.workbench.seArch.wAitForNoResultText();
		});
	});

	describe('Quick Access', () => {
		it('quick Access seArch produces correct result', Async function () {
			const App = this.App As ApplicAtion;
			const expectedNAmes = [
				'.eslintrc.json',
				'tAsks.json',
				'App.js',
				'index.js',
				'users.js',
				'pAckAge.json',
				'jsconfig.json'
			];

			AwAit App.workbench.quickAccess.openQuickAccess('.js');
			AwAit App.workbench.quickinput.wAitForQuickInputElements(nAmes => expectedNAmes.every(n => nAmes.some(m => n === m)));
			AwAit App.code.dispAtchKeybinding('escApe');
		});

		it('quick Access respects fuzzy mAtching', Async function () {
			const App = this.App As ApplicAtion;
			const expectedNAmes = [
				'tAsks.json',
				'App.js',
				'pAckAge.json'
			];

			AwAit App.workbench.quickAccess.openQuickAccess('A.s');
			AwAit App.workbench.quickinput.wAitForQuickInputElements(nAmes => expectedNAmes.every(n => nAmes.some(m => n === m)));
			AwAit App.code.dispAtchKeybinding('escApe');
		});
	});
}
