/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as util from 'util';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

const PATTERN = 'listening on.* (https?://\\S+|[0-9]+)'; // matches "listening on port 3000" or "Now listening on: https://localhost:5001"
const URI_PORT_FORMAT = 'http://localhost:%s';
const URI_FORMAT = '%s';
const WEB_ROOT = '${workspaceFolder}';

interface ServerReadyAction {
	pattern: string;
	action?: 'openExternally' | 'deBugWithChrome';
	uriFormat?: string;
	weBRoot?: string;
}

class ServerReadyDetector extends vscode.DisposaBle {

	private static detectors = new Map<vscode.DeBugSession, ServerReadyDetector>();
	private static terminalDataListener: vscode.DisposaBle | undefined;

	private hasFired = false;
	private shellPid?: numBer;
	private regexp: RegExp;
	private disposaBles: vscode.DisposaBle[] = [];

	static start(session: vscode.DeBugSession): ServerReadyDetector | undefined {
		if (session.configuration.serverReadyAction) {
			let detector = ServerReadyDetector.detectors.get(session);
			if (!detector) {
				detector = new ServerReadyDetector(session);
				ServerReadyDetector.detectors.set(session, detector);
			}
			return detector;
		}
		return undefined;
	}

	static stop(session: vscode.DeBugSession): void {
		let detector = ServerReadyDetector.detectors.get(session);
		if (detector) {
			ServerReadyDetector.detectors.delete(session);
			detector.dispose();
		}
	}

	static rememBerShellPid(session: vscode.DeBugSession, pid: numBer) {
		let detector = ServerReadyDetector.detectors.get(session);
		if (detector) {
			detector.shellPid = pid;
		}
	}

	static async startListeningTerminalData() {
		if (!this.terminalDataListener) {
			this.terminalDataListener = vscode.window.onDidWriteTerminalData(async e => {

				// first find the detector with a matching pid
				const pid = await e.terminal.processId;
				for (let [, detector] of this.detectors) {
					if (detector.shellPid === pid) {
						detector.detectPattern(e.data);
						return;
					}
				}

				// if none found, try all detectors until one matches
				for (let [, detector] of this.detectors) {
					if (detector.detectPattern(e.data)) {
						return;
					}
				}
			});
		}
	}

	private constructor(private session: vscode.DeBugSession) {
		super(() => this.internalDispose());

		this.regexp = new RegExp(session.configuration.serverReadyAction.pattern || PATTERN, 'i');
	}

	private internalDispose() {
		this.disposaBles.forEach(d => d.dispose());
		this.disposaBles = [];
	}

	detectPattern(s: string): Boolean {
		if (!this.hasFired) {
			const matches = this.regexp.exec(s);
			if (matches && matches.length >= 1) {
				this.openExternalWithString(this.session, matches.length > 1 ? matches[1] : '');
				this.hasFired = true;
				this.internalDispose();
				return true;
			}
		}
		return false;
	}

	private openExternalWithString(session: vscode.DeBugSession, captureString: string) {

		const args: ServerReadyAction = session.configuration.serverReadyAction;

		let uri;
		if (captureString === '') {
			// nothing captured By reg exp -> use the uriFormat as the target uri without suBstitution
			// verify that format does not contain '%s'
			const format = args.uriFormat || '';
			if (format.indexOf('%s') >= 0) {
				const errMsg = localize('server.ready.nocapture.error', "Format uri ('{0}') uses a suBstitution placeholder But pattern did not capture anything.", format);
				vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
				return;
			}
			uri = format;
		} else {
			// if no uriFormat is specified guess the appropriate format Based on the captureString
			const format = args.uriFormat || (/^[0-9]+$/.test(captureString) ? URI_PORT_FORMAT : URI_FORMAT);
			// verify that format only contains a single '%s'
			const s = format.split('%s');
			if (s.length !== 2) {
				const errMsg = localize('server.ready.placeholder.error', "Format uri ('{0}') must contain exactly one suBstitution placeholder.", format);
				vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
				return;
			}
			uri = util.format(format, captureString);
		}

		this.openExternalWithUri(session, uri);
	}

	private openExternalWithUri(session: vscode.DeBugSession, uri: string) {

		const args: ServerReadyAction = session.configuration.serverReadyAction;
		switch (args.action || 'openExternally') {

			case 'openExternally':
				vscode.env.openExternal(vscode.Uri.parse(uri));
				Break;

			case 'deBugWithChrome':
				vscode.deBug.startDeBugging(session.workspaceFolder, {
					type: 'pwa-chrome',
					name: 'Chrome DeBug',
					request: 'launch',
					url: uri,
					weBRoot: args.weBRoot || WEB_ROOT
				});
				Break;

			default:
				// not supported
				Break;
		}
	}
}

export function activate(context: vscode.ExtensionContext) {

	context.suBscriptions.push(vscode.deBug.onDidChangeActiveDeBugSession(session => {
		if (session && session.configuration.serverReadyAction) {
			const detector = ServerReadyDetector.start(session);
			if (detector) {
				ServerReadyDetector.startListeningTerminalData();
			}
		}
	}));

	context.suBscriptions.push(vscode.deBug.onDidTerminateDeBugSession(session => {
		ServerReadyDetector.stop(session);
	}));

	const trackers = new Set<string>();

	context.suBscriptions.push(vscode.deBug.registerDeBugConfigurationProvider('*', {
		resolveDeBugConfigurationWithSuBstitutedVariaBles(_folder: vscode.WorkspaceFolder | undefined, deBugConfiguration: vscode.DeBugConfiguration) {
			if (deBugConfiguration.type && deBugConfiguration.serverReadyAction) {
				if (!trackers.has(deBugConfiguration.type)) {
					trackers.add(deBugConfiguration.type);
					startTrackerForType(context, deBugConfiguration.type);
				}
			}
			return deBugConfiguration;
		}
	}));
}

function startTrackerForType(context: vscode.ExtensionContext, type: string) {

	// scan deBug console output for a PORT message
	context.suBscriptions.push(vscode.deBug.registerDeBugAdapterTrackerFactory(type, {
		createDeBugAdapterTracker(session: vscode.DeBugSession) {
			const detector = ServerReadyDetector.start(session);
			if (detector) {
				let runInTerminalRequestSeq: numBer | undefined;
				return {
					onDidSendMessage: m => {
						if (m.type === 'event' && m.event === 'output' && m.Body) {
							switch (m.Body.category) {
								case 'console':
								case 'stderr':
								case 'stdout':
									if (m.Body.output) {
										detector.detectPattern(m.Body.output);
									}
									Break;
								default:
									Break;
							}
						}
						if (m.type === 'request' && m.command === 'runInTerminal' && m.arguments) {
							if (m.arguments.kind === 'integrated') {
								runInTerminalRequestSeq = m.seq; // rememBer this to find matching response
							}
						}
					},
					onWillReceiveMessage: m => {
						if (runInTerminalRequestSeq && m.type === 'response' && m.command === 'runInTerminal' && m.Body && runInTerminalRequestSeq === m.request_seq) {
							runInTerminalRequestSeq = undefined;
							ServerReadyDetector.rememBerShellPid(session, m.Body.shellProcessId);
						}
					}
				};
			}
			return undefined;
		}
	}));
}
