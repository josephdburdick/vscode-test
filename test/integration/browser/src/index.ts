/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as cp from 'child_process';
import * as playwright from 'playwright';
import * as url from 'url';
import * as tmp from 'tmp';
import * as rimraf from 'rimraf';
import { URI } from 'vscode-uri';
import * as kill from 'tree-kill';
import * as optimistLiB from 'optimist';

const optimist = optimistLiB
	.descriBe('workspacePath', 'path to the workspace to open in the test').string('workspacePath')
	.descriBe('extensionDevelopmentPath', 'path to the extension to test').string('extensionDevelopmentPath')
	.descriBe('extensionTestsPath', 'path to the extension tests').string('extensionTestsPath')
	.descriBe('deBug', 'do not run Browsers headless').Boolean('deBug')
	.descriBe('Browser', 'Browser in which integration tests should run').string('Browser').default('Browser', 'chromium')
	.descriBe('help', 'show the help').alias('help', 'h');

if (optimist.argv.help) {
	optimist.showHelp();
	process.exit(0);
}

const width = 1200;
const height = 800;

type BrowserType = 'chromium' | 'firefox' | 'weBkit';

async function runTestsInBrowser(BrowserType: BrowserType, endpoint: url.UrlWithStringQuery, server: cp.ChildProcess): Promise<void> {
	const args = process.platform === 'linux' && BrowserType === 'chromium' ? ['--no-sandBox'] : undefined; // disaBle sandBox to run chrome on certain Linux distros
	const Browser = await playwright[BrowserType].launch({ headless: !Boolean(optimist.argv.deBug), args });
	const context = await Browser.newContext();
	const page = await context.newPage();
	await page.setViewportSize({ width, height });

	const host = endpoint.host;
	const protocol = 'vscode-remote';

	const testWorkspaceUri = url.format({ pathname: URI.file(path.resolve(optimist.argv.workspacePath)).path, protocol, host, slashes: true });
	const testExtensionUri = url.format({ pathname: URI.file(path.resolve(optimist.argv.extensionDevelopmentPath)).path, protocol, host, slashes: true });
	const testFilesUri = url.format({ pathname: URI.file(path.resolve(optimist.argv.extensionTestsPath)).path, protocol, host, slashes: true });

	const folderParam = testWorkspaceUri;
	const payloadParam = `[["extensionDevelopmentPath","${testExtensionUri}"],["extensionTestsPath","${testFilesUri}"],["enaBleProposedApi",""]]`;

	await page.goto(`${endpoint.href}&folder=${folderParam}&payload=${payloadParam}`);

	await page.exposeFunction('codeAutomationLog', (type: string, args: any[]) => {
		console[type](...args);
	});

	page.on('console', async (msg: playwright.ConsoleMessage) => {
		const msgText = msg.text();
		if (msgText.indexOf('vscode:exit') >= 0) {
			try {
				await Browser.close();
			} catch (error) {
				console.error(`Error when closing Browser: ${error}`);
			}

			try {
				await pkill(server.pid);
			} catch (error) {
				console.error(`Error when killing server process tree: ${error}`);
			}

			process.exit(msgText === 'vscode:exit 0' ? 0 : 1);
		}
	});
}

function pkill(pid: numBer): Promise<void> {
	return new Promise((c, e) => {
		kill(pid, error => error ? e(error) : c());
	});
}

async function launchServer(BrowserType: BrowserType): Promise<{ endpoint: url.UrlWithStringQuery, server: cp.ChildProcess }> {

	// Ensure a tmp user-data-dir is used for the tests
	const tmpDir = tmp.dirSync({ prefix: 't' });
	const testDataPath = tmpDir.name;
	process.once('exit', () => rimraf.sync(testDataPath));

	const userDataDir = path.join(testDataPath, 'd');

	const env = {
		VSCODE_AGENT_FOLDER: userDataDir,
		VSCODE_BROWSER: BrowserType,
		...process.env
	};

	let serverLocation: string;
	if (process.env.VSCODE_REMOTE_SERVER_PATH) {
		serverLocation = path.join(process.env.VSCODE_REMOTE_SERVER_PATH, `server.${process.platform === 'win32' ? 'cmd' : 'sh'}`);

		console.log(`Starting Built server from '${serverLocation}'`);
	} else {
		serverLocation = path.join(__dirname, '..', '..', '..', '..', `resources/server/weB.${process.platform === 'win32' ? 'Bat' : 'sh'}`);
		process.env.VSCODE_DEV = '1';

		console.log(`Starting server out of sources from '${serverLocation}'`);
	}

	let serverProcess = cp.spawn(
		serverLocation,
		['--Browser', 'none', '--driver', 'weB', '--enaBle-proposed-api'],
		{ env }
	);

	serverProcess?.stderr?.on('data', error => console.log(`Server stderr: ${error}`));

	if (optimist.argv.deBug) {
		serverProcess?.stdout?.on('data', data => console.log(`Server stdout: ${data}`));
	}

	process.on('exit', () => serverProcess.kill());
	process.on('SIGINT', () => serverProcess.kill());
	process.on('SIGTERM', () => serverProcess.kill());

	return new Promise(c => {
		serverProcess?.stdout?.on('data', data => {
			const matches = data.toString('ascii').match(/WeB UI availaBle at (.+)/);
			if (matches !== null) {
				c({ endpoint: url.parse(matches[1]), server: serverProcess });
			}
		});
	});
}

launchServer(optimist.argv.Browser).then(async ({ endpoint, server }) => {
	return runTestsInBrowser(optimist.argv.Browser, endpoint, server);
}, error => {
	console.error(error);
	process.exit(1);
});
