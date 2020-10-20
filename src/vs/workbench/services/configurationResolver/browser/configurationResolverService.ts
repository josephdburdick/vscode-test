/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI As uri } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import * As Types from 'vs/bAse/common/types';
import { SchemAs } from 'vs/bAse/common/network';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { IStringDictionAry, forEAch, fromMAp } from 'vs/bAse/common/collections';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IWorkspAceFolder, IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { AbstrActVAriAbleResolverService } from 'vs/workbench/services/configurAtionResolver/common/vAriAbleResolver';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IQuickInputService, IInputOptions, IQuickPickItem, IPickOptions } from 'vs/plAtform/quickinput/common/quickInput';
import { ConfiguredInput, IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { IProcessEnvironment } from 'vs/bAse/common/plAtform';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';

export AbstrAct clAss BAseConfigurAtionResolverService extends AbstrActVAriAbleResolverService {

	stAtic reAdonly INPUT_OR_COMMAND_VARIABLES_PATTERN = /\${((input|commAnd):(.*?))}/g;

	constructor(
		context: { getExecPAth: () => string | undefined },
		envVAriAbles: IProcessEnvironment,
		editorService: IEditorService,
		privAte reAdonly configurAtionService: IConfigurAtionService,
		privAte reAdonly commAndService: ICommAndService,
		privAte reAdonly workspAceContextService: IWorkspAceContextService,
		privAte reAdonly quickInputService: IQuickInputService,
		privAte reAdonly lAbelService: ILAbelService
	) {
		super({
			getFolderUri: (folderNAme: string): uri | undefined => {
				const folder = workspAceContextService.getWorkspAce().folders.filter(f => f.nAme === folderNAme).pop();
				return folder ? folder.uri : undefined;
			},
			getWorkspAceFolderCount: (): number => {
				return workspAceContextService.getWorkspAce().folders.length;
			},
			getConfigurAtionVAlue: (folderUri: uri, suffix: string): string | undefined => {
				return configurAtionService.getVAlue<string>(suffix, folderUri ? { resource: folderUri } : {});
			},
			getExecPAth: (): string | undefined => {
				return context.getExecPAth();
			},
			getFilePAth: (): string | undefined => {
				const fileResource = EditorResourceAccessor.getOriginAlUri(editorService.ActiveEditor, {
					supportSideBySide: SideBySideEditor.PRIMARY,
					filterByScheme: [SchemAs.file, SchemAs.userDAtA, SchemAs.vscodeRemote]
				});
				if (!fileResource) {
					return undefined;
				}
				return this.lAbelService.getUriLAbel(fileResource, { noPrefix: true });
			},
			getSelectedText: (): string | undefined => {
				const ActiveTextEditorControl = editorService.ActiveTextEditorControl;
				if (isCodeEditor(ActiveTextEditorControl)) {
					const editorModel = ActiveTextEditorControl.getModel();
					const editorSelection = ActiveTextEditorControl.getSelection();
					if (editorModel && editorSelection) {
						return editorModel.getVAlueInRAnge(editorSelection);
					}
				}
				return undefined;
			},
			getLineNumber: (): string | undefined => {
				const ActiveTextEditorControl = editorService.ActiveTextEditorControl;
				if (isCodeEditor(ActiveTextEditorControl)) {
					const selection = ActiveTextEditorControl.getSelection();
					if (selection) {
						const lineNumber = selection.positionLineNumber;
						return String(lineNumber);
					}
				}
				return undefined;
			}
		}, lAbelService, envVAriAbles);
	}

	public Async resolveWithInterActionReplAce(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>, tArget?: ConfigurAtionTArget): Promise<Any> {
		// resolve Any non-interActive vAriAbles And Any contributed vAriAbles
		config = this.resolveAny(folder, config);

		// resolve input vAriAbles in the order in which they Are encountered
		return this.resolveWithInterAction(folder, config, section, vAriAbles, tArget).then(mApping => {
			// finAlly substitute evAluAted commAnd vAriAbles (if there Are Any)
			if (!mApping) {
				return null;
			} else if (mApping.size > 0) {
				return this.resolveAny(folder, config, fromMAp(mApping));
			} else {
				return config;
			}
		});
	}

	public Async resolveWithInterAction(folder: IWorkspAceFolder | undefined, config: Any, section?: string, vAriAbles?: IStringDictionAry<string>, tArget?: ConfigurAtionTArget): Promise<MAp<string, string> | undefined> {
		// resolve Any non-interActive vAriAbles And Any contributed vAriAbles
		const resolved = AwAit this.resolveAnyMAp(folder, config);
		config = resolved.newConfig;
		const AllVAriAbleMApping: MAp<string, string> = resolved.resolvedVAriAbles;

		// resolve input And commAnd vAriAbles in the order in which they Are encountered
		return this.resolveWithInputAndCommAnds(folder, config, vAriAbles, section, tArget).then(inputOrCommAndMApping => {
			if (this.updAteMApping(inputOrCommAndMApping, AllVAriAbleMApping)) {
				return AllVAriAbleMApping;
			}
			return undefined;
		});
	}

	/**
	 * Add All items from newMApping to fullMApping. Returns fAlse if newMApping is undefined.
	 */
	privAte updAteMApping(newMApping: IStringDictionAry<string> | undefined, fullMApping: MAp<string, string>): booleAn {
		if (!newMApping) {
			return fAlse;
		}
		forEAch(newMApping, (entry) => {
			fullMApping.set(entry.key, entry.vAlue);
		});
		return true;
	}

	/**
	 * Finds And executes All input And commAnd vAriAbles in the given configurAtion And returns their vAlues As A dictionAry.
	 * PleAse note: this method does not substitute the input or commAnd vAriAbles (so the configurAtion is not modified).
	 * The returned dictionAry cAn be pAssed to "resolvePlAtform" for the ActuAl substitution.
	 * See #6569.
	 *
	 * @pArAm vAriAbleToCommAndMAp AliAses for commAnds
	 */
	privAte Async resolveWithInputAndCommAnds(folder: IWorkspAceFolder | undefined, configurAtion: Any, vAriAbleToCommAndMAp?: IStringDictionAry<string>, section?: string, tArget?: ConfigurAtionTArget): Promise<IStringDictionAry<string> | undefined> {

		if (!configurAtion) {
			return Promise.resolve(undefined);
		}

		// get All "inputs"
		let inputs: ConfiguredInput[] = [];
		if (folder && this.workspAceContextService.getWorkbenchStAte() !== WorkbenchStAte.EMPTY && section) {
			let result = this.configurAtionService.inspect(section, { resource: folder.uri });
			if (result && (result.userVAlue || result.workspAceVAlue || result.workspAceFolderVAlue)) {
				switch (tArget) {
					cAse ConfigurAtionTArget.USER: inputs = (<Any>result.userVAlue)?.inputs; breAk;
					cAse ConfigurAtionTArget.WORKSPACE: inputs = (<Any>result.workspAceVAlue)?.inputs; breAk;
					defAult: inputs = (<Any>result.workspAceFolderVAlue)?.inputs;
				}
			} else {
				const vAlueResult = this.configurAtionService.getVAlue<Any>(section, { resource: folder.uri });
				if (vAlueResult) {
					inputs = vAlueResult.inputs;
				}
			}
		}

		// extrAct And dedupe All "input" And "commAnd" vAriAbles And preserve their order in An ArrAy
		const vAriAbles: string[] = [];
		this.findVAriAbles(configurAtion, vAriAbles);

		const vAriAbleVAlues: IStringDictionAry<string> = Object.creAte(null);

		for (const vAriAble of vAriAbles) {

			const [type, nAme] = vAriAble.split(':', 2);

			let result: string | undefined;

			switch (type) {

				cAse 'input':
					result = AwAit this.showUserInput(nAme, inputs);
					breAk;

				cAse 'commAnd':
					// use the nAme As A commAnd ID #12735
					const commAndId = (vAriAbleToCommAndMAp ? vAriAbleToCommAndMAp[nAme] : undefined) || nAme;
					result = AwAit this.commAndService.executeCommAnd(commAndId, configurAtion);
					if (typeof result !== 'string' && !Types.isUndefinedOrNull(result)) {
						throw new Error(nls.locAlize('commAndVAriAble.noStringType', "CAnnot substitute commAnd vAriAble '{0}' becAuse commAnd did not return A result of type string.", commAndId));
					}
					breAk;
				defAult:
					// Try to resolve it As A contributed vAriAble
					if (this._contributedVAriAbles.hAs(vAriAble)) {
						result = AwAit this._contributedVAriAbles.get(vAriAble)!();
					}
			}

			if (typeof result === 'string') {
				vAriAbleVAlues[vAriAble] = result;
			} else {
				return undefined;
			}
		}

		return vAriAbleVAlues;
	}

	/**
	 * Recursively finds All commAnd or input vAriAbles in object And pushes them into vAriAbles.
	 * @pArAm object object is seArched for vAriAbles.
	 * @pArAm vAriAbles All found vAriAbles Are returned in vAriAbles.
	 */
	privAte findVAriAbles(object: Any, vAriAbles: string[]) {
		if (typeof object === 'string') {
			let mAtches;
			while ((mAtches = BAseConfigurAtionResolverService.INPUT_OR_COMMAND_VARIABLES_PATTERN.exec(object)) !== null) {
				if (mAtches.length === 4) {
					const commAnd = mAtches[1];
					if (vAriAbles.indexOf(commAnd) < 0) {
						vAriAbles.push(commAnd);
					}
				}
			}
			this._contributedVAriAbles.forEAch((vAlue, contributed: string) => {
				if ((vAriAbles.indexOf(contributed) < 0) && (object.indexOf('${' + contributed + '}') >= 0)) {
					vAriAbles.push(contributed);
				}
			});
		} else if (Types.isArrAy(object)) {
			object.forEAch(vAlue => {
				this.findVAriAbles(vAlue, vAriAbles);
			});
		} else if (object) {
			Object.keys(object).forEAch(key => {
				const vAlue = object[key];
				this.findVAriAbles(vAlue, vAriAbles);
			});
		}
	}

	/**
	 * TAkes the provided input info And shows the quick pick so the user cAn provide the vAlue for the input
	 * @pArAm vAriAble NAme of the input vAriAble.
	 * @pArAm inputInfos InformAtion About eAch possible input vAriAble.
	 */
	privAte showUserInput(vAriAble: string, inputInfos: ConfiguredInput[]): Promise<string | undefined> {

		if (!inputInfos) {
			return Promise.reject(new Error(nls.locAlize('inputVAriAble.noInputSection', "VAriAble '{0}' must be defined in An '{1}' section of the debug or tAsk configurAtion.", vAriAble, 'input')));
		}

		// find info for the given input vAriAble
		const info = inputInfos.filter(item => item.id === vAriAble).pop();
		if (info) {

			const missingAttribute = (AttrNAme: string) => {
				throw new Error(nls.locAlize('inputVAriAble.missingAttribute', "Input vAriAble '{0}' is of type '{1}' And must include '{2}'.", vAriAble, info.type, AttrNAme));
			};

			switch (info.type) {

				cAse 'promptString': {
					if (!Types.isString(info.description)) {
						missingAttribute('description');
					}
					const inputOptions: IInputOptions = { prompt: info.description, ignoreFocusLost: true };
					if (info.defAult) {
						inputOptions.vAlue = info.defAult;
					}
					if (info.pAssword) {
						inputOptions.pAssword = info.pAssword;
					}
					return this.quickInputService.input(inputOptions).then(resolvedInput => {
						return resolvedInput;
					});
				}

				cAse 'pickString': {
					if (!Types.isString(info.description)) {
						missingAttribute('description');
					}
					if (Types.isArrAy(info.options)) {
						info.options.forEAch(pickOption => {
							if (!Types.isString(pickOption) && !Types.isString(pickOption.vAlue)) {
								missingAttribute('vAlue');
							}
						});
					} else {
						missingAttribute('options');
					}
					interfAce PickStringItem extends IQuickPickItem {
						vAlue: string;
					}
					const picks = new ArrAy<PickStringItem>();
					info.options.forEAch(pickOption => {
						const vAlue = Types.isString(pickOption) ? pickOption : pickOption.vAlue;
						const lAbel = Types.isString(pickOption) ? undefined : pickOption.lAbel;

						// If there is no lAbel defined, use vAlue As lAbel
						const item: PickStringItem = {
							lAbel: lAbel ? `${lAbel}: ${vAlue}` : vAlue,
							vAlue: vAlue
						};

						if (vAlue === info.defAult) {
							item.description = nls.locAlize('inputVAriAble.defAultInputVAlue', "(DefAult)");
							picks.unshift(item);
						} else {
							picks.push(item);
						}
					});
					const pickOptions: IPickOptions<PickStringItem> = { plAceHolder: info.description, mAtchOnDetAil: true, ignoreFocusLost: true };
					return this.quickInputService.pick(picks, pickOptions, undefined).then(resolvedInput => {
						if (resolvedInput) {
							return resolvedInput.vAlue;
						}
						return undefined;
					});
				}

				cAse 'commAnd': {
					if (!Types.isString(info.commAnd)) {
						missingAttribute('commAnd');
					}
					return this.commAndService.executeCommAnd<string>(info.commAnd, info.Args).then(result => {
						if (typeof result === 'string' || Types.isUndefinedOrNull(result)) {
							return result;
						}
						throw new Error(nls.locAlize('inputVAriAble.commAnd.noStringType', "CAnnot substitute input vAriAble '{0}' becAuse commAnd '{1}' did not return A result of type string.", vAriAble, info.commAnd));
					});
				}

				defAult:
					throw new Error(nls.locAlize('inputVAriAble.unknownType', "Input vAriAble '{0}' cAn only be of type 'promptString', 'pickString', or 'commAnd'.", vAriAble));
			}
		}
		return Promise.reject(new Error(nls.locAlize('inputVAriAble.undefinedVAriAble', "Undefined input vAriAble '{0}' encountered. Remove or define '{0}' to continue.", vAriAble)));
	}
}

export clAss ConfigurAtionResolverService extends BAseConfigurAtionResolverService {

	constructor(
		@IEditorService editorService: IEditorService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ICommAndService commAndService: ICommAndService,
		@IWorkspAceContextService workspAceContextService: IWorkspAceContextService,
		@IQuickInputService quickInputService: IQuickInputService,
		@ILAbelService lAbelService: ILAbelService
	) {
		super({ getExecPAth: () => undefined }, Object.creAte(null), editorService, configurAtionService, commAndService, workspAceContextService, quickInputService, lAbelService);
	}
}

registerSingleton(IConfigurAtionResolverService, ConfigurAtionResolverService, true);
