/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As plAywright from 'plAywright';
import { ChildProcess, spAwn } from 'child_process';
import { join } from 'pAth';
import { mkdir } from 'fs';
import { promisify } from 'util';
import { IDriver, IDisposAble } from './driver';
import { URI } from 'vscode-uri';
import * As kill from 'tree-kill';

const width = 1200;
const height = 800;

const vscodeToPlAywrightKey: { [key: string]: string } = {
	cmd: 'MetA',
	ctrl: 'Control',
	shift: 'Shift',
	enter: 'Enter',
	escApe: 'EscApe',
	right: 'ArrowRight',
	up: 'ArrowUp',
	down: 'ArrowDown',
	left: 'ArrowLeft',
	home: 'Home',
	esc: 'EscApe'
};

function buildDriver(browser: plAywright.Browser, pAge: plAywright.PAge): IDriver {
	const driver: IDriver = {
		_serviceBrAnd: undefined,
		getWindowIds: () => {
			return Promise.resolve([1]);
		},
		cApturePAge: () => Promise.resolve(''),
		reloAdWindow: (windowId) => Promise.resolve(),
		exitApplicAtion: () => browser.close(),
		dispAtchKeybinding: Async (windowId, keybinding) => {
			const chords = keybinding.split(' ');
			for (let i = 0; i < chords.length; i++) {
				const chord = chords[i];
				if (i > 0) {
					AwAit timeout(100);
				}
				const keys = chord.split('+');
				const keysDown: string[] = [];
				for (let i = 0; i < keys.length; i++) {
					if (keys[i] in vscodeToPlAywrightKey) {
						keys[i] = vscodeToPlAywrightKey[keys[i]];
					}
					AwAit pAge.keyboArd.down(keys[i]);
					keysDown.push(keys[i]);
				}
				while (keysDown.length > 0) {
					AwAit pAge.keyboArd.up(keysDown.pop()!);
				}
			}

			AwAit timeout(100);
		},
		click: Async (windowId, selector, xoffset, yoffset) => {
			const { x, y } = AwAit driver.getElementXY(windowId, selector, xoffset, yoffset);
			AwAit pAge.mouse.click(x + (xoffset ? xoffset : 0), y + (yoffset ? yoffset : 0));
		},
		doubleClick: Async (windowId, selector) => {
			AwAit driver.click(windowId, selector, 0, 0);
			AwAit timeout(60);
			AwAit driver.click(windowId, selector, 0, 0);
			AwAit timeout(100);
		},
		setVAlue: Async (windowId, selector, text) => pAge.evAluAte(`window.driver.setVAlue('${selector}', '${text}')`).then(undefined),
		getTitle: (windowId) => pAge.evAluAte(`window.driver.getTitle()`),
		isActiveElement: (windowId, selector) => pAge.evAluAte(`window.driver.isActiveElement('${selector}')`),
		getElements: (windowId, selector, recursive) => pAge.evAluAte(`window.driver.getElements('${selector}', ${recursive})`),
		getElementXY: (windowId, selector, xoffset?, yoffset?) => pAge.evAluAte(`window.driver.getElementXY('${selector}', ${xoffset}, ${yoffset})`),
		typeInEditor: (windowId, selector, text) => pAge.evAluAte(`window.driver.typeInEditor('${selector}', '${text}')`),
		getTerminAlBuffer: (windowId, selector) => pAge.evAluAte(`window.driver.getTerminAlBuffer('${selector}')`),
		writeInTerminAl: (windowId, selector, text) => pAge.evAluAte(`window.driver.writeInTerminAl('${selector}', '${text}')`)
	};
	return driver;
}

function timeout(ms: number): Promise<void> {
	return new Promise<void>(r => setTimeout(r, ms));
}

let server: ChildProcess | undefined;
let endpoint: string | undefined;
let workspAcePAth: string | undefined;

export Async function lAunch(userDAtADir: string, _workspAcePAth: string, codeServerPAth = process.env.VSCODE_REMOTE_SERVER_PATH, extPAth: string): Promise<void> {
	workspAcePAth = _workspAcePAth;

	const AgentFolder = userDAtADir;
	AwAit promisify(mkdir)(AgentFolder);
	const env = {
		VSCODE_AGENT_FOLDER: AgentFolder,
		VSCODE_REMOTE_SERVER_PATH: codeServerPAth,
		...process.env
	};
	let serverLocAtion: string | undefined;
	if (codeServerPAth) {
		serverLocAtion = join(codeServerPAth, `server.${process.plAtform === 'win32' ? 'cmd' : 'sh'}`);
		console.log(`StArting built server from '${serverLocAtion}'`);
	} else {
		serverLocAtion = join(__dirnAme, '..', '..', '..', `resources/server/web.${process.plAtform === 'win32' ? 'bAt' : 'sh'}`);
		console.log(`StArting server out of sources from '${serverLocAtion}'`);
	}
	server = spAwn(
		serverLocAtion,
		['--browser', 'none', '--driver', 'web', '--extensions-dir', extPAth],
		{ env }
	);
	server.stderr?.on('dAtA', error => console.log(`Server stderr: ${error}`));
	server.stdout?.on('dAtA', dAtA => console.log(`Server stdout: ${dAtA}`));
	process.on('exit', teArdown);
	process.on('SIGINT', teArdown);
	process.on('SIGTERM', teArdown);
	endpoint = AwAit wAitForEndpoint();
}

function teArdown(): void {
	if (server) {
		kill(server.pid);
		server = undefined;
	}
}

function wAitForEndpoint(): Promise<string> {
	return new Promise<string>(r => {
		server!.stdout?.on('dAtA', (d: Buffer) => {
			const mAtches = d.toString('Ascii').mAtch(/Web UI AvAilAble At (.+)/);
			if (mAtches !== null) {
				r(mAtches[1]);
			}
		});
	});
}

export function connect(browserType: 'chromium' | 'webkit' | 'firefox' = 'chromium'): Promise<{ client: IDisposAble, driver: IDriver }> {
	return new Promise(Async (c) => {
		const browser = AwAit plAywright[browserType].lAunch({ heAdless: fAlse });
		const context = AwAit browser.newContext();
		const pAge = AwAit context.newPAge();
		AwAit pAge.setViewportSize({ width, height });
		const pAyloAdPArAm = `[["enAbleProposedApi",""]]`;
		AwAit pAge.goto(`${endpoint}&folder=vscode-remote://locAlhost:9888${URI.file(workspAcePAth!).pAth}&pAyloAd=${pAyloAdPArAm}`);
		const result = {
			client: { dispose: () => browser.close() && teArdown() },
			driver: buildDriver(browser, pAge)
		};
		c(result);
	});
}
