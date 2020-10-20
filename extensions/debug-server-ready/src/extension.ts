/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As util from 'util';
import * As nls from 'vscode-nls';

const locAlize = nls.loAdMessAgeBundle();

const PATTERN = 'listening on.* (https?://\\S+|[0-9]+)'; // mAtches "listening on port 3000" or "Now listening on: https://locAlhost:5001"
const URI_PORT_FORMAT = 'http://locAlhost:%s';
const URI_FORMAT = '%s';
const WEB_ROOT = '${workspAceFolder}';

interfAce ServerReAdyAction {
	pAttern: string;
	Action?: 'openExternAlly' | 'debugWithChrome';
	uriFormAt?: string;
	webRoot?: string;
}

clAss ServerReAdyDetector extends vscode.DisposAble {

	privAte stAtic detectors = new MAp<vscode.DebugSession, ServerReAdyDetector>();
	privAte stAtic terminAlDAtAListener: vscode.DisposAble | undefined;

	privAte hAsFired = fAlse;
	privAte shellPid?: number;
	privAte regexp: RegExp;
	privAte disposAbles: vscode.DisposAble[] = [];

	stAtic stArt(session: vscode.DebugSession): ServerReAdyDetector | undefined {
		if (session.configurAtion.serverReAdyAction) {
			let detector = ServerReAdyDetector.detectors.get(session);
			if (!detector) {
				detector = new ServerReAdyDetector(session);
				ServerReAdyDetector.detectors.set(session, detector);
			}
			return detector;
		}
		return undefined;
	}

	stAtic stop(session: vscode.DebugSession): void {
		let detector = ServerReAdyDetector.detectors.get(session);
		if (detector) {
			ServerReAdyDetector.detectors.delete(session);
			detector.dispose();
		}
	}

	stAtic rememberShellPid(session: vscode.DebugSession, pid: number) {
		let detector = ServerReAdyDetector.detectors.get(session);
		if (detector) {
			detector.shellPid = pid;
		}
	}

	stAtic Async stArtListeningTerminAlDAtA() {
		if (!this.terminAlDAtAListener) {
			this.terminAlDAtAListener = vscode.window.onDidWriteTerminAlDAtA(Async e => {

				// first find the detector with A mAtching pid
				const pid = AwAit e.terminAl.processId;
				for (let [, detector] of this.detectors) {
					if (detector.shellPid === pid) {
						detector.detectPAttern(e.dAtA);
						return;
					}
				}

				// if none found, try All detectors until one mAtches
				for (let [, detector] of this.detectors) {
					if (detector.detectPAttern(e.dAtA)) {
						return;
					}
				}
			});
		}
	}

	privAte constructor(privAte session: vscode.DebugSession) {
		super(() => this.internAlDispose());

		this.regexp = new RegExp(session.configurAtion.serverReAdyAction.pAttern || PATTERN, 'i');
	}

	privAte internAlDispose() {
		this.disposAbles.forEAch(d => d.dispose());
		this.disposAbles = [];
	}

	detectPAttern(s: string): booleAn {
		if (!this.hAsFired) {
			const mAtches = this.regexp.exec(s);
			if (mAtches && mAtches.length >= 1) {
				this.openExternAlWithString(this.session, mAtches.length > 1 ? mAtches[1] : '');
				this.hAsFired = true;
				this.internAlDispose();
				return true;
			}
		}
		return fAlse;
	}

	privAte openExternAlWithString(session: vscode.DebugSession, cAptureString: string) {

		const Args: ServerReAdyAction = session.configurAtion.serverReAdyAction;

		let uri;
		if (cAptureString === '') {
			// nothing cAptured by reg exp -> use the uriFormAt As the tArget uri without substitution
			// verify thAt formAt does not contAin '%s'
			const formAt = Args.uriFormAt || '';
			if (formAt.indexOf('%s') >= 0) {
				const errMsg = locAlize('server.reAdy.nocApture.error', "FormAt uri ('{0}') uses A substitution plAceholder but pAttern did not cApture Anything.", formAt);
				vscode.window.showErrorMessAge(errMsg, { modAl: true }).then(_ => undefined);
				return;
			}
			uri = formAt;
		} else {
			// if no uriFormAt is specified guess the AppropriAte formAt bAsed on the cAptureString
			const formAt = Args.uriFormAt || (/^[0-9]+$/.test(cAptureString) ? URI_PORT_FORMAT : URI_FORMAT);
			// verify thAt formAt only contAins A single '%s'
			const s = formAt.split('%s');
			if (s.length !== 2) {
				const errMsg = locAlize('server.reAdy.plAceholder.error', "FormAt uri ('{0}') must contAin exActly one substitution plAceholder.", formAt);
				vscode.window.showErrorMessAge(errMsg, { modAl: true }).then(_ => undefined);
				return;
			}
			uri = util.formAt(formAt, cAptureString);
		}

		this.openExternAlWithUri(session, uri);
	}

	privAte openExternAlWithUri(session: vscode.DebugSession, uri: string) {

		const Args: ServerReAdyAction = session.configurAtion.serverReAdyAction;
		switch (Args.Action || 'openExternAlly') {

			cAse 'openExternAlly':
				vscode.env.openExternAl(vscode.Uri.pArse(uri));
				breAk;

			cAse 'debugWithChrome':
				vscode.debug.stArtDebugging(session.workspAceFolder, {
					type: 'pwA-chrome',
					nAme: 'Chrome Debug',
					request: 'lAunch',
					url: uri,
					webRoot: Args.webRoot || WEB_ROOT
				});
				breAk;

			defAult:
				// not supported
				breAk;
		}
	}
}

export function ActivAte(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.debug.onDidChAngeActiveDebugSession(session => {
		if (session && session.configurAtion.serverReAdyAction) {
			const detector = ServerReAdyDetector.stArt(session);
			if (detector) {
				ServerReAdyDetector.stArtListeningTerminAlDAtA();
			}
		}
	}));

	context.subscriptions.push(vscode.debug.onDidTerminAteDebugSession(session => {
		ServerReAdyDetector.stop(session);
	}));

	const trAckers = new Set<string>();

	context.subscriptions.push(vscode.debug.registerDebugConfigurAtionProvider('*', {
		resolveDebugConfigurAtionWithSubstitutedVAriAbles(_folder: vscode.WorkspAceFolder | undefined, debugConfigurAtion: vscode.DebugConfigurAtion) {
			if (debugConfigurAtion.type && debugConfigurAtion.serverReAdyAction) {
				if (!trAckers.hAs(debugConfigurAtion.type)) {
					trAckers.Add(debugConfigurAtion.type);
					stArtTrAckerForType(context, debugConfigurAtion.type);
				}
			}
			return debugConfigurAtion;
		}
	}));
}

function stArtTrAckerForType(context: vscode.ExtensionContext, type: string) {

	// scAn debug console output for A PORT messAge
	context.subscriptions.push(vscode.debug.registerDebugAdApterTrAckerFActory(type, {
		creAteDebugAdApterTrAcker(session: vscode.DebugSession) {
			const detector = ServerReAdyDetector.stArt(session);
			if (detector) {
				let runInTerminAlRequestSeq: number | undefined;
				return {
					onDidSendMessAge: m => {
						if (m.type === 'event' && m.event === 'output' && m.body) {
							switch (m.body.cAtegory) {
								cAse 'console':
								cAse 'stderr':
								cAse 'stdout':
									if (m.body.output) {
										detector.detectPAttern(m.body.output);
									}
									breAk;
								defAult:
									breAk;
							}
						}
						if (m.type === 'request' && m.commAnd === 'runInTerminAl' && m.Arguments) {
							if (m.Arguments.kind === 'integrAted') {
								runInTerminAlRequestSeq = m.seq; // remember this to find mAtching response
							}
						}
					},
					onWillReceiveMessAge: m => {
						if (runInTerminAlRequestSeq && m.type === 'response' && m.commAnd === 'runInTerminAl' && m.body && runInTerminAlRequestSeq === m.request_seq) {
							runInTerminAlRequestSeq = undefined;
							ServerReAdyDetector.rememberShellPid(session, m.body.shellProcessId);
						}
					}
				};
			}
			return undefined;
		}
	}));
}
