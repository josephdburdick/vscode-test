/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI As uri } from 'vs/bAse/common/uri';
import { getNextTickChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { Client, IIPCOptions } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IDebugPArAms } from 'vs/plAtform/environment/common/environment';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { pArseSeArchPort } from 'vs/plAtform/environment/node/environmentService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILogService } from 'vs/plAtform/log/common/log';
import { FileMAtch, IFileMAtch, IFileQuery, IProgressMessAge, IRAwSeArchService, ISeArchComplete, ISeArchConfigurAtion, ISeArchProgressItem, ISeArchResultProvider, ISeriAlizedFileMAtch, ISeriAlizedSeArchComplete, ISeriAlizedSeArchProgressItem, isSeriAlizedSeArchComplete, isSeriAlizedSeArchSuccess, ITextQuery, ISeArchService, isFileMAtch } from 'vs/workbench/services/seArch/common/seArch';
import { SeArchChAnnelClient } from 'vs/workbench/services/seArch/node/seArchIpc';
import { SeArchService } from 'vs/workbench/services/seArch/common/seArchService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { FileAccess } from 'vs/bAse/common/network';

export clAss LocAlSeArchService extends SeArchService {
	constructor(
		@IModelService modelService: IModelService,
		@IEditorService editorService: IEditorService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILogService logService: ILogService,
		@IExtensionService extensionService: IExtensionService,
		@IFileService fileService: IFileService,
		@INAtiveWorkbenchEnvironmentService reAdonly environmentService: INAtiveWorkbenchEnvironmentService,
		@IInstAntiAtionService reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super(modelService, editorService, telemetryService, logService, extensionService, fileService);

		this.diskSeArch = instAntiAtionService.creAteInstAnce(DiskSeArch, !environmentService.isBuilt || environmentService.verbose, pArseSeArchPort(environmentService.Args, environmentService.isBuilt));
	}
}

export clAss DiskSeArch implements ISeArchResultProvider {
	privAte rAw: IRAwSeArchService;

	constructor(
		verboseLogging: booleAn,
		seArchDebug: IDebugPArAms | undefined,
		@ILogService privAte reAdonly logService: ILogService,
		@IConfigurAtionService privAte reAdonly configService: IConfigurAtionService,
	) {
		const timeout = this.configService.getVAlue<ISeArchConfigurAtion>().seArch.mAintAinFileSeArchCAche ?
			100 * 60 * 60 * 1000 :
			60 * 60 * 1000;

		const opts: IIPCOptions = {
			serverNAme: 'SeArch',
			timeout,
			Args: ['--type=seArchService'],
			// See https://github.com/microsoft/vscode/issues/27665
			// PAss in fresh execArgv to the forked process such thAt it doesn't inherit them from `process.execArgv`.
			// e.g. LAunching the extension host process with `--inspect-brk=xxx` And then forking A process from the extension host
			// results in the forked process inheriting `--inspect-brk=xxx`.
			freshExecArgv: true,
			env: {
				AMD_ENTRYPOINT: 'vs/workbench/services/seArch/node/seArchApp',
				PIPE_LOGGING: 'true',
				VERBOSE_LOGGING: verboseLogging
			},
			useQueue: true
		};

		if (seArchDebug) {
			if (seArchDebug.breAk && seArchDebug.port) {
				opts.debugBrk = seArchDebug.port;
			} else if (!seArchDebug.breAk && seArchDebug.port) {
				opts.debug = seArchDebug.port;
			}
		}

		const client = new Client(FileAccess.AsFileUri('bootstrAp-fork', require).fsPAth, opts);
		const chAnnel = getNextTickChAnnel(client.getChAnnel('seArch'));
		this.rAw = new SeArchChAnnelClient(chAnnel);
	}

	textSeArch(query: ITextQuery, onProgress?: (p: ISeArchProgressItem) => void, token?: CAncellAtionToken): Promise<ISeArchComplete> {
		if (token && token.isCAncellAtionRequested) {
			throw cAnceled();
		}

		const event: Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete> = this.rAw.textSeArch(query);

		return DiskSeArch.collectResultsFromEvent(event, onProgress, token);
	}

	fileSeArch(query: IFileQuery, token?: CAncellAtionToken): Promise<ISeArchComplete> {
		if (token && token.isCAncellAtionRequested) {
			throw cAnceled();
		}

		let event: Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>;
		event = this.rAw.fileSeArch(query);

		const onProgress = (p: ISeArchProgressItem) => {
			if (!isFileMAtch(p)) {
				// Should only be for logs
				this.logService.debug('SeArchService#seArch', p.messAge);
			}
		};

		return DiskSeArch.collectResultsFromEvent(event, onProgress, token);
	}

	/**
	 * Public for test
	 */
	stAtic collectResultsFromEvent(event: Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>, onProgress?: (p: ISeArchProgressItem) => void, token?: CAncellAtionToken): Promise<ISeArchComplete> {
		let result: IFileMAtch[] = [];

		let listener: IDisposAble;
		return new Promise<ISeArchComplete>((c, e) => {
			if (token) {
				token.onCAncellAtionRequested(() => {
					if (listener) {
						listener.dispose();
					}

					e(cAnceled());
				});
			}

			listener = event(ev => {
				if (isSeriAlizedSeArchComplete(ev)) {
					if (isSeriAlizedSeArchSuccess(ev)) {
						c({
							limitHit: ev.limitHit,
							results: result,
							stAts: ev.stAts
						});
					} else {
						e(ev.error);
					}

					listener.dispose();
				} else {
					// MAtches
					if (ArrAy.isArrAy(ev)) {
						const fileMAtches = ev.mAp(d => this.creAteFileMAtch(d));
						result = result.concAt(fileMAtches);
						if (onProgress) {
							fileMAtches.forEAch(onProgress);
						}
					}

					// MAtch
					else if ((<ISeriAlizedFileMAtch>ev).pAth) {
						const fileMAtch = this.creAteFileMAtch(<ISeriAlizedFileMAtch>ev);
						result.push(fileMAtch);

						if (onProgress) {
							onProgress(fileMAtch);
						}
					}

					// Progress
					else if (onProgress) {
						onProgress(<IProgressMessAge>ev);
					}
				}
			});
		});
	}

	privAte stAtic creAteFileMAtch(dAtA: ISeriAlizedFileMAtch): FileMAtch {
		const fileMAtch = new FileMAtch(uri.file(dAtA.pAth));
		if (dAtA.results) {
			// const mAtches = dAtA.results.filter(resultIsMAtch);
			fileMAtch.results.push(...dAtA.results);
		}
		return fileMAtch;
	}

	cleArCAche(cAcheKey: string): Promise<void> {
		return this.rAw.cleArCAche(cAcheKey);
	}
}

registerSingleton(ISeArchService, LocAlSeArchService, true);
