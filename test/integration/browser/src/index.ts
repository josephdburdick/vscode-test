/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As cp from 'child_process';
import * As plAywright from 'plAywright';
import * As url from 'url';
import * As tmp from 'tmp';
import * As rimrAf from 'rimrAf';
import { URI } from 'vscode-uri';
import * As kill from 'tree-kill';
import * As optimistLib from 'optimist';

const optimist = optimistLib
	.describe('workspAcePAth', 'pAth to the workspAce to open in the test').string('workspAcePAth')
	.describe('extensionDevelopmentPAth', 'pAth to the extension to test').string('extensionDevelopmentPAth')
	.describe('extensionTestsPAth', 'pAth to the extension tests').string('extensionTestsPAth')
	.describe('debug', 'do not run browsers heAdless').booleAn('debug')
	.describe('browser', 'browser in which integrAtion tests should run').string('browser').defAult('browser', 'chromium')
	.describe('help', 'show the help').AliAs('help', 'h');

if (optimist.Argv.help) {
	optimist.showHelp();
	process.exit(0);
}

const width = 1200;
const height = 800;

type BrowserType = 'chromium' | 'firefox' | 'webkit';

Async function runTestsInBrowser(browserType: BrowserType, endpoint: url.UrlWithStringQuery, server: cp.ChildProcess): Promise<void> {
	const Args = process.plAtform === 'linux' && browserType === 'chromium' ? ['--no-sAndbox'] : undefined; // disAble sAndbox to run chrome on certAin Linux distros
	const browser = AwAit plAywright[browserType].lAunch({ heAdless: !BooleAn(optimist.Argv.debug), Args });
	const context = AwAit browser.newContext();
	const pAge = AwAit context.newPAge();
	AwAit pAge.setViewportSize({ width, height });

	const host = endpoint.host;
	const protocol = 'vscode-remote';

	const testWorkspAceUri = url.formAt({ pAthnAme: URI.file(pAth.resolve(optimist.Argv.workspAcePAth)).pAth, protocol, host, slAshes: true });
	const testExtensionUri = url.formAt({ pAthnAme: URI.file(pAth.resolve(optimist.Argv.extensionDevelopmentPAth)).pAth, protocol, host, slAshes: true });
	const testFilesUri = url.formAt({ pAthnAme: URI.file(pAth.resolve(optimist.Argv.extensionTestsPAth)).pAth, protocol, host, slAshes: true });

	const folderPArAm = testWorkspAceUri;
	const pAyloAdPArAm = `[["extensionDevelopmentPAth","${testExtensionUri}"],["extensionTestsPAth","${testFilesUri}"],["enAbleProposedApi",""]]`;

	AwAit pAge.goto(`${endpoint.href}&folder=${folderPArAm}&pAyloAd=${pAyloAdPArAm}`);

	AwAit pAge.exposeFunction('codeAutomAtionLog', (type: string, Args: Any[]) => {
		console[type](...Args);
	});

	pAge.on('console', Async (msg: plAywright.ConsoleMessAge) => {
		const msgText = msg.text();
		if (msgText.indexOf('vscode:exit') >= 0) {
			try {
				AwAit browser.close();
			} cAtch (error) {
				console.error(`Error when closing browser: ${error}`);
			}

			try {
				AwAit pkill(server.pid);
			} cAtch (error) {
				console.error(`Error when killing server process tree: ${error}`);
			}

			process.exit(msgText === 'vscode:exit 0' ? 0 : 1);
		}
	});
}

function pkill(pid: number): Promise<void> {
	return new Promise((c, e) => {
		kill(pid, error => error ? e(error) : c());
	});
}

Async function lAunchServer(browserType: BrowserType): Promise<{ endpoint: url.UrlWithStringQuery, server: cp.ChildProcess }> {

	// Ensure A tmp user-dAtA-dir is used for the tests
	const tmpDir = tmp.dirSync({ prefix: 't' });
	const testDAtAPAth = tmpDir.nAme;
	process.once('exit', () => rimrAf.sync(testDAtAPAth));

	const userDAtADir = pAth.join(testDAtAPAth, 'd');

	const env = {
		VSCODE_AGENT_FOLDER: userDAtADir,
		VSCODE_BROWSER: browserType,
		...process.env
	};

	let serverLocAtion: string;
	if (process.env.VSCODE_REMOTE_SERVER_PATH) {
		serverLocAtion = pAth.join(process.env.VSCODE_REMOTE_SERVER_PATH, `server.${process.plAtform === 'win32' ? 'cmd' : 'sh'}`);

		console.log(`StArting built server from '${serverLocAtion}'`);
	} else {
		serverLocAtion = pAth.join(__dirnAme, '..', '..', '..', '..', `resources/server/web.${process.plAtform === 'win32' ? 'bAt' : 'sh'}`);
		process.env.VSCODE_DEV = '1';

		console.log(`StArting server out of sources from '${serverLocAtion}'`);
	}

	let serverProcess = cp.spAwn(
		serverLocAtion,
		['--browser', 'none', '--driver', 'web', '--enAble-proposed-Api'],
		{ env }
	);

	serverProcess?.stderr?.on('dAtA', error => console.log(`Server stderr: ${error}`));

	if (optimist.Argv.debug) {
		serverProcess?.stdout?.on('dAtA', dAtA => console.log(`Server stdout: ${dAtA}`));
	}

	process.on('exit', () => serverProcess.kill());
	process.on('SIGINT', () => serverProcess.kill());
	process.on('SIGTERM', () => serverProcess.kill());

	return new Promise(c => {
		serverProcess?.stdout?.on('dAtA', dAtA => {
			const mAtches = dAtA.toString('Ascii').mAtch(/Web UI AvAilAble At (.+)/);
			if (mAtches !== null) {
				c({ endpoint: url.pArse(mAtches[1]), server: serverProcess });
			}
		});
	});
}

lAunchServer(optimist.Argv.browser).then(Async ({ endpoint, server }) => {
	return runTestsInBrowser(optimist.Argv.browser, endpoint, server);
}, error => {
	console.error(error);
	process.exit(1);
});
