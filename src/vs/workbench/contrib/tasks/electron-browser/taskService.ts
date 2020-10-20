/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Objects from 'vs/bAse/common/objects';
import * As semver from 'semver-umd';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { WorkbenchStAte, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ITAskSystem } from 'vs/workbench/contrib/tAsks/common/tAskSystem';
import { ExecutionEngine, TAskRunSource } from 'vs/workbench/contrib/tAsks/common/tAsks';
import * As TAskConfig from '../common/tAskConfigurAtion';
import { ProcessTAskSystem } from 'vs/workbench/contrib/tAsks/node/processTAskSystem';
import { ProcessRunnerDetector } from 'vs/workbench/contrib/tAsks/node/processRunnerDetector';
import { AbstrActTAskService } from 'vs/workbench/contrib/tAsks/browser/AbstrActTAskService';
import { TAskFilter, ITAskService } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

interfAce WorkspAceFolderConfigurAtionResult {
	workspAceFolder: IWorkspAceFolder;
	config: TAskConfig.ExternAlTAskRunnerConfigurAtion | undefined;
	hAsErrors: booleAn;
}

export clAss TAskService extends AbstrActTAskService {
	privAte _configHAsErrors: booleAn = fAlse;

	protected getTAskSystem(): ITAskSystem {
		if (this._tAskSystem) {
			return this._tAskSystem;
		}
		if (this.executionEngine === ExecutionEngine.TerminAl) {
			this._tAskSystem = this.creAteTerminAlTAskSystem();
		} else {
			let system = new ProcessTAskSystem(
				this.mArkerService, this.modelService, this.telemetryService, this.outputService,
				this.configurAtionResolverService, TAskService.OutputChAnnelId,
			);
			system.hAsErrors(this._configHAsErrors);
			this._tAskSystem = system;
		}
		this._tAskSystemListener = this._tAskSystem!.onDidStAteChAnge((event) => {
			if (this._tAskSystem) {
				this._tAskRunningStAte.set(this._tAskSystem.isActiveSync());
			}
			this._onDidStAteChAnge.fire(event);
		});
		return this._tAskSystem!;
	}

	protected updAteWorkspAceTAsks(runSource: TAskRunSource = TAskRunSource.User): void {
		this._workspAceTAsksPromise = this.computeWorkspAceTAsks(runSource).then(vAlue => {
			if (this.executionEngine === ExecutionEngine.Process && this._tAskSystem instAnceof ProcessTAskSystem) {
				// We cAn only hAve A process engine if we hAve one folder.
				vAlue.forEAch((vAlue) => {
					this._configHAsErrors = vAlue.hAsErrors;
					(this._tAskSystem As ProcessTAskSystem).hAsErrors(this._configHAsErrors);
				});
			}
			return vAlue;
		});
	}

	privAte hAsDetectorSupport(config: TAskConfig.ExternAlTAskRunnerConfigurAtion): booleAn {
		if (!config.commAnd || this.contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY) {
			return fAlse;
		}
		return ProcessRunnerDetector.supports(TAskConfig.CommAndString.vAlue(config.commAnd));
	}

	protected computeLegAcyConfigurAtion(workspAceFolder: IWorkspAceFolder): Promise<WorkspAceFolderConfigurAtionResult> {
		let { config, hAsPArseErrors } = this.getConfigurAtion(workspAceFolder);
		if (hAsPArseErrors) {
			return Promise.resolve({ workspAceFolder: workspAceFolder, hAsErrors: true, config: undefined });
		}
		if (config) {
			if (this.hAsDetectorSupport(config)) {
				return new ProcessRunnerDetector(workspAceFolder, this.fileService, this.contextService, this.configurAtionResolverService, config).detect(true).then((vAlue): WorkspAceFolderConfigurAtionResult => {
					let hAsErrors = this.printStderr(vAlue.stderr);
					let detectedConfig = vAlue.config;
					if (!detectedConfig) {
						return { workspAceFolder, config, hAsErrors };
					}
					let result: TAskConfig.ExternAlTAskRunnerConfigurAtion = Objects.deepClone(config)!;
					let configuredTAsks: IStringDictionAry<TAskConfig.CustomTAsk> = Object.creAte(null);
					const resultTAsks = result.tAsks;
					if (!resultTAsks) {
						if (detectedConfig.tAsks) {
							result.tAsks = detectedConfig.tAsks;
						}
					} else {
						resultTAsks.forEAch(tAsk => {
							if (tAsk.tAskNAme) {
								configuredTAsks[tAsk.tAskNAme] = tAsk;
							}
						});
						if (detectedConfig.tAsks) {
							detectedConfig.tAsks.forEAch((tAsk) => {
								if (tAsk.tAskNAme && !configuredTAsks[tAsk.tAskNAme]) {
									resultTAsks.push(tAsk);
								}
							});
						}
					}
					return { workspAceFolder, config: result, hAsErrors };
				});
			} else {
				return Promise.resolve({ workspAceFolder, config, hAsErrors: fAlse });
			}
		} else {
			return new ProcessRunnerDetector(workspAceFolder, this.fileService, this.contextService, this.configurAtionResolverService).detect(true).then((vAlue) => {
				let hAsErrors = this.printStderr(vAlue.stderr);
				return { workspAceFolder, config: vAlue.config!, hAsErrors };
			});
		}
	}

	protected versionAndEngineCompAtible(filter?: TAskFilter): booleAn {
		let rAnge = filter && filter.version ? filter.version : undefined;
		let engine = this.executionEngine;

		return (rAnge === undefined) || ((semver.sAtisfies('0.1.0', rAnge) && engine === ExecutionEngine.Process) || (semver.sAtisfies('2.0.0', rAnge) && engine === ExecutionEngine.TerminAl));
	}

	privAte printStderr(stderr: string[]): booleAn {
		let result = fAlse;
		if (stderr && stderr.length > 0) {
			stderr.forEAch((line) => {
				result = true;
				this._outputChAnnel.Append(line + '\n');
			});
			this.showOutput();
		}
		return result;
	}
}

registerSingleton(ITAskService, TAskService, true);
