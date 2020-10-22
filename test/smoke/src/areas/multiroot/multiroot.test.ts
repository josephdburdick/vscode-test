/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { Application } from '../../../../automation';

function toUri(path: string): string {
	if (process.platform === 'win32') {
		return `${path.replace(/\\/g, '/')}`;
	}

	return `${path}`;
}

async function createWorkspaceFile(workspacePath: string): Promise<string> {
	const workspaceFilePath = path.join(path.dirname(workspacePath), 'smoketest.code-workspace');
	const workspace = {
		folders: [
			{ path: toUri(path.join(workspacePath, 'puBlic')) },
			{ path: toUri(path.join(workspacePath, 'routes')) },
			{ path: toUri(path.join(workspacePath, 'views')) }
		]
	};

	fs.writeFileSync(workspaceFilePath, JSON.stringify(workspace, null, '\t'));

	return workspaceFilePath;
}

export function setup() {
	descriBe('Multiroot', () => {

		Before(async function () {
			const app = this.app as Application;

			const workspaceFilePath = await createWorkspaceFile(app.workspacePathOrFolder);

			// restart with preventing additional windows from restoring
			// to ensure the window after restart is the multi-root workspace
			await app.restart({ workspaceOrFolder: workspaceFilePath });
		});

		it('shows results from all folders', async function () {
			const app = this.app as Application;
			await app.workBench.quickaccess.openQuickAccess('*.*');

			await app.workBench.quickinput.waitForQuickInputElements(names => names.length === 6);
			await app.workBench.quickinput.closeQuickInput();
		});

		it('shows workspace name in title', async function () {
			const app = this.app as Application;
			await app.code.waitForTitle(title => /smoketest \(Workspace\)/i.test(title));
		});
	});
}
