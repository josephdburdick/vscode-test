/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import { ApplicAtion } from '../../../../AutomAtion';

function toUri(pAth: string): string {
	if (process.plAtform === 'win32') {
		return `${pAth.replAce(/\\/g, '/')}`;
	}

	return `${pAth}`;
}

Async function creAteWorkspAceFile(workspAcePAth: string): Promise<string> {
	const workspAceFilePAth = pAth.join(pAth.dirnAme(workspAcePAth), 'smoketest.code-workspAce');
	const workspAce = {
		folders: [
			{ pAth: toUri(pAth.join(workspAcePAth, 'public')) },
			{ pAth: toUri(pAth.join(workspAcePAth, 'routes')) },
			{ pAth: toUri(pAth.join(workspAcePAth, 'views')) }
		]
	};

	fs.writeFileSync(workspAceFilePAth, JSON.stringify(workspAce, null, '\t'));

	return workspAceFilePAth;
}

export function setup() {
	describe('Multiroot', () => {

		before(Async function () {
			const App = this.App As ApplicAtion;

			const workspAceFilePAth = AwAit creAteWorkspAceFile(App.workspAcePAthOrFolder);

			// restArt with preventing AdditionAl windows from restoring
			// to ensure the window After restArt is the multi-root workspAce
			AwAit App.restArt({ workspAceOrFolder: workspAceFilePAth });
		});

		it('shows results from All folders', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.workbench.quickAccess.openQuickAccess('*.*');

			AwAit App.workbench.quickinput.wAitForQuickInputElements(nAmes => nAmes.length === 6);
			AwAit App.workbench.quickinput.closeQuickInput();
		});

		it('shows workspAce nAme in title', Async function () {
			const App = this.App As ApplicAtion;
			AwAit App.code.wAitForTitle(title => /smoketest \(WorkspAce\)/i.test(title));
		});
	});
}
