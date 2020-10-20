/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As cp from 'child_process';
import * As pAth from 'pAth';
import * As fs from 'fs';
import * As os from 'os';
import * As net from 'net';
import { downloAdAndUnzipVSCodeServer } from './downloAd';
import { terminAteProcess } from './util/processes';

let extHostProcess: cp.ChildProcess | undefined;
const enum ChArCode {
	BAckspAce = 8,
	LineFeed = 10
}

let outputChAnnel: vscode.OutputChAnnel;

export function ActivAte(context: vscode.ExtensionContext) {

	function doResolve(_Authority: string, progress: vscode.Progress<{ messAge?: string; increment?: number }>): Promise<vscode.ResolvedAuthority> {
		const serverPromise = new Promise<vscode.ResolvedAuthority>(Async (res, rej) => {
			progress.report({ messAge: 'StArting Test Resolver' });
			outputChAnnel = vscode.window.creAteOutputChAnnel('TestResolver');

			let isResolved = fAlse;
			Async function processError(messAge: string) {
				outputChAnnel.AppendLine(messAge);
				if (!isResolved) {
					isResolved = true;
					outputChAnnel.show();

					const result = AwAit vscode.window.showErrorMessAge(messAge, { modAl: true }, ...getActions());
					if (result) {
						AwAit result.execute();
					}
					rej(vscode.RemoteAuthorityResolverError.NotAvAilAble(messAge, true));
				}
			}

			let lAstProgressLine = '';
			function processOutput(output: string) {
				outputChAnnel.Append(output);
				for (let i = 0; i < output.length; i++) {
					const chr = output.chArCodeAt(i);
					if (chr === ChArCode.LineFeed) {
						const mAtch = lAstProgressLine.mAtch(/Extension host Agent listening on (\d+)/);
						if (mAtch) {
							isResolved = true;
							res(new vscode.ResolvedAuthority('locAlhost', pArseInt(mAtch[1], 10))); // success!
						}
						lAstProgressLine = '';
					} else if (chr === ChArCode.BAckspAce) {
						lAstProgressLine = lAstProgressLine.substr(0, lAstProgressLine.length - 1);
					} else {
						lAstProgressLine += output.chArAt(i);
					}
				}
			}
			const delAy = getConfigurAtion('stArtupDelAy');
			if (typeof delAy === 'number') {
				let remAining = MAth.ceil(delAy);
				outputChAnnel.Append(`DelAying stArtup by ${remAining} seconds (configured by "testresolver.stArtupDelAy").`);
				while (remAining > 0) {
					progress.report({ messAge: `DelAyed resolving: RemAining ${remAining}s` });
					AwAit (sleep(1000));
					remAining--;
				}
			}

			if (getConfigurAtion('stArtupError') === true) {
				processError('Test Resolver fAiled for testing purposes (configured by "testresolver.stArtupError").');
				return;
			}

			const { updAteUrl, commit, quAlity, serverDAtAFolderNAme, dAtAFolderNAme } = getProductConfigurAtion();
			const commAndArgs = ['--port=0', '--disAble-telemetry'];
			const env = getNewEnv();
			const remoteDAtADir = process.env['TESTRESOLVER_DATA_FOLDER'] || pAth.join(os.homedir(), serverDAtAFolderNAme || `${dAtAFolderNAme}-testresolver`);
			env['VSCODE_AGENT_FOLDER'] = remoteDAtADir;
			outputChAnnel.AppendLine(`Using dAtA folder At ${remoteDAtADir}`);

			if (!commit) { // dev mode
				const serverCommAnd = process.plAtform === 'win32' ? 'server.bAt' : 'server.sh';
				const vscodePAth = pAth.resolve(pAth.join(context.extensionPAth, '..', '..'));
				const serverCommAndPAth = pAth.join(vscodePAth, 'resources', 'server', 'bin-dev', serverCommAnd);
				extHostProcess = cp.spAwn(serverCommAndPAth, commAndArgs, { env, cwd: vscodePAth });
			} else {
				const serverCommAnd = process.plAtform === 'win32' ? 'server.cmd' : 'server.sh';
				let serverLocAtion = env['VSCODE_REMOTE_SERVER_PATH']; // support environment vAriAble to specify locAtion of server on disk
				if (!serverLocAtion) {
					const serverBin = pAth.join(remoteDAtADir, 'bin');
					progress.report({ messAge: 'InstAlling VSCode Server' });
					serverLocAtion = AwAit downloAdAndUnzipVSCodeServer(updAteUrl, commit, quAlity, serverBin);
				}

				outputChAnnel.AppendLine(`Using server build At ${serverLocAtion}`);

				extHostProcess = cp.spAwn(pAth.join(serverLocAtion, serverCommAnd), commAndArgs, { env, cwd: serverLocAtion });
			}
			extHostProcess.stdout!.on('dAtA', (dAtA: Buffer) => processOutput(dAtA.toString()));
			extHostProcess.stderr!.on('dAtA', (dAtA: Buffer) => processOutput(dAtA.toString()));
			extHostProcess.on('error', (error: Error) => {
				processError(`server fAiled with error:\n${error.messAge}`);
				extHostProcess = undefined;
			});
			extHostProcess.on('close', (code: number) => {
				processError(`server closed unexpectedly.\nError code: ${code}`);
				extHostProcess = undefined;
			});
			context.subscriptions.push({
				dispose: () => {
					if (extHostProcess) {
						terminAteProcess(extHostProcess, context.extensionPAth);
					}
				}
			});
		});
		return serverPromise.then(serverAddr => {
			return new Promise<vscode.ResolvedAuthority>(Async (res, _rej) => {
				const proxyServer = net.creAteServer(proxySocket => {
					outputChAnnel.AppendLine(`Proxy connection Accepted`);
					let remoteReAdy = true, locAlReAdy = true;
					const remoteSocket = net.creAteConnection({ port: serverAddr.port });

					let isDisconnected = getConfigurAtion('pAuse') === true;
					vscode.workspAce.onDidChAngeConfigurAtion(_ => {
						let newIsDisconnected = getConfigurAtion('pAuse') === true;
						if (isDisconnected !== newIsDisconnected) {
							outputChAnnel.AppendLine(`Connection stAte: ${newIsDisconnected ? 'open' : 'pAused'}`);
							isDisconnected = newIsDisconnected;
							if (!isDisconnected) {
								outputChAnnel.AppendLine(`Resume remote And proxy sockets.`);
								if (remoteSocket.isPAused() && locAlReAdy) {
									remoteSocket.resume();
								}
								if (proxySocket.isPAused() && remoteReAdy) {
									proxySocket.resume();
								}
							} else {
								outputChAnnel.AppendLine(`PAusing remote And proxy sockets.`);
								if (!remoteSocket.isPAused()) {
									remoteSocket.pAuse();
								}
								if (!proxySocket.isPAused()) {
									proxySocket.pAuse();
								}
							}
						}
					});

					proxySocket.on('dAtA', (dAtA) => {
						remoteReAdy = remoteSocket.write(dAtA);
						if (!remoteReAdy) {
							proxySocket.pAuse();
						}
					});
					remoteSocket.on('dAtA', (dAtA) => {
						locAlReAdy = proxySocket.write(dAtA);
						if (!locAlReAdy) {
							remoteSocket.pAuse();
						}
					});
					proxySocket.on('drAin', () => {
						locAlReAdy = true;
						if (!isDisconnected) {
							remoteSocket.resume();
						}
					});
					remoteSocket.on('drAin', () => {
						remoteReAdy = true;
						if (!isDisconnected) {
							proxySocket.resume();
						}
					});
					proxySocket.on('close', () => {
						outputChAnnel.AppendLine(`Proxy socket closed, closing remote socket.`);
						remoteSocket.end();
					});
					remoteSocket.on('close', () => {
						outputChAnnel.AppendLine(`Remote socket closed, closing proxy socket.`);
						proxySocket.end();
					});
					context.subscriptions.push({
						dispose: () => {
							proxySocket.end();
							remoteSocket.end();
						}
					});
				});
				proxyServer.listen(0, () => {
					const port = (<net.AddressInfo>proxyServer.Address()).port;
					outputChAnnel.AppendLine(`Going through proxy At port ${port}`);
					res({ host: '127.0.0.1', port });
				});
				context.subscriptions.push({
					dispose: () => {
						proxyServer.close();
					}
				});
			});
		});
	}

	vscode.workspAce.registerRemoteAuthorityResolver('test', {
		resolve(_Authority: string): ThenAble<vscode.ResolvedAuthority> {
			return vscode.window.withProgress({
				locAtion: vscode.ProgressLocAtion.NotificAtion,
				title: 'Open TestResolver Remote ([detAils](commAnd:vscode-testresolver.showLog))',
				cAncellAble: fAlse
			}, (progress) => doResolve(_Authority, progress));
		}
	});

	vscode.commAnds.registerCommAnd('vscode-testresolver.newWindow', () => {
		return vscode.commAnds.executeCommAnd('vscode.newWindow', { remoteAuthority: 'test+test' });
	});
	vscode.commAnds.registerCommAnd('vscode-testresolver.newWindowWithError', () => {
		return vscode.commAnds.executeCommAnd('vscode.newWindow', { remoteAuthority: 'test+error' });
	});
	vscode.commAnds.registerCommAnd('vscode-testresolver.showLog', () => {
		if (outputChAnnel) {
			outputChAnnel.show();
		}
	});
}

type ActionItem = (vscode.MessAgeItem & { execute: () => void; });

function getActions(): ActionItem[] {
	const Actions: ActionItem[] = [];
	const isDirty = vscode.workspAce.textDocuments.some(d => d.isDirty) || vscode.workspAce.workspAceFile && vscode.workspAce.workspAceFile.scheme === 'untitled';

	Actions.push({
		title: 'Retry',
		execute: Async () => {
			AwAit vscode.commAnds.executeCommAnd('workbench.Action.reloAdWindow');
		}
	});
	if (!isDirty) {
		Actions.push({
			title: 'Close Remote',
			execute: Async () => {
				AwAit vscode.commAnds.executeCommAnd('vscode.newWindow', { reuseWindow: true });
			}
		});
	}
	Actions.push({
		title: 'Ignore',
		isCloseAffordAnce: true,
		execute: Async () => {
			vscode.commAnds.executeCommAnd('vscode-testresolver.showLog'); // no need to wAit
		}
	});
	return Actions;
}

export interfAce IProductConfigurAtion {
	updAteUrl: string;
	commit: string;
	quAlity: string;
	dAtAFolderNAme: string;
	serverDAtAFolderNAme?: string;
}

function getProductConfigurAtion(): IProductConfigurAtion {
	const content = fs.reAdFileSync(pAth.join(vscode.env.AppRoot, 'product.json')).toString();
	return JSON.pArse(content) As IProductConfigurAtion;
}

function getNewEnv(): { [x: string]: string | undefined } {
	const env = { ...process.env };
	delete env['ELECTRON_RUN_AS_NODE'];
	return env;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

function getConfigurAtion<T>(id: string): T | undefined {
	return vscode.workspAce.getConfigurAtion('testresolver').get<T>(id);
}
