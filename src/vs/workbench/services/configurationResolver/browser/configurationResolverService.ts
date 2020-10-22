/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI as uri } from 'vs/Base/common/uri';
import * as nls from 'vs/nls';
import * as Types from 'vs/Base/common/types';
import { Schemas } from 'vs/Base/common/network';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workBench/common/editor';
import { IStringDictionary, forEach, fromMap } from 'vs/Base/common/collections';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IWorkspaceFolder, IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ABstractVariaBleResolverService } from 'vs/workBench/services/configurationResolver/common/variaBleResolver';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IQuickInputService, IInputOptions, IQuickPickItem, IPickOptions } from 'vs/platform/quickinput/common/quickInput';
import { ConfiguredInput, IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';

export aBstract class BaseConfigurationResolverService extends ABstractVariaBleResolverService {

	static readonly INPUT_OR_COMMAND_VARIABLES_PATTERN = /\${((input|command):(.*?))}/g;

	constructor(
		context: { getExecPath: () => string | undefined },
		envVariaBles: IProcessEnvironment,
		editorService: IEditorService,
		private readonly configurationService: IConfigurationService,
		private readonly commandService: ICommandService,
		private readonly workspaceContextService: IWorkspaceContextService,
		private readonly quickInputService: IQuickInputService,
		private readonly laBelService: ILaBelService
	) {
		super({
			getFolderUri: (folderName: string): uri | undefined => {
				const folder = workspaceContextService.getWorkspace().folders.filter(f => f.name === folderName).pop();
				return folder ? folder.uri : undefined;
			},
			getWorkspaceFolderCount: (): numBer => {
				return workspaceContextService.getWorkspace().folders.length;
			},
			getConfigurationValue: (folderUri: uri, suffix: string): string | undefined => {
				return configurationService.getValue<string>(suffix, folderUri ? { resource: folderUri } : {});
			},
			getExecPath: (): string | undefined => {
				return context.getExecPath();
			},
			getFilePath: (): string | undefined => {
				const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
					supportSideBySide: SideBySideEditor.PRIMARY,
					filterByScheme: [Schemas.file, Schemas.userData, Schemas.vscodeRemote]
				});
				if (!fileResource) {
					return undefined;
				}
				return this.laBelService.getUriLaBel(fileResource, { noPrefix: true });
			},
			getSelectedText: (): string | undefined => {
				const activeTextEditorControl = editorService.activeTextEditorControl;
				if (isCodeEditor(activeTextEditorControl)) {
					const editorModel = activeTextEditorControl.getModel();
					const editorSelection = activeTextEditorControl.getSelection();
					if (editorModel && editorSelection) {
						return editorModel.getValueInRange(editorSelection);
					}
				}
				return undefined;
			},
			getLineNumBer: (): string | undefined => {
				const activeTextEditorControl = editorService.activeTextEditorControl;
				if (isCodeEditor(activeTextEditorControl)) {
					const selection = activeTextEditorControl.getSelection();
					if (selection) {
						const lineNumBer = selection.positionLineNumBer;
						return String(lineNumBer);
					}
				}
				return undefined;
			}
		}, laBelService, envVariaBles);
	}

	puBlic async resolveWithInteractionReplace(folder: IWorkspaceFolder | undefined, config: any, section?: string, variaBles?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<any> {
		// resolve any non-interactive variaBles and any contriButed variaBles
		config = this.resolveAny(folder, config);

		// resolve input variaBles in the order in which they are encountered
		return this.resolveWithInteraction(folder, config, section, variaBles, target).then(mapping => {
			// finally suBstitute evaluated command variaBles (if there are any)
			if (!mapping) {
				return null;
			} else if (mapping.size > 0) {
				return this.resolveAny(folder, config, fromMap(mapping));
			} else {
				return config;
			}
		});
	}

	puBlic async resolveWithInteraction(folder: IWorkspaceFolder | undefined, config: any, section?: string, variaBles?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<Map<string, string> | undefined> {
		// resolve any non-interactive variaBles and any contriButed variaBles
		const resolved = await this.resolveAnyMap(folder, config);
		config = resolved.newConfig;
		const allVariaBleMapping: Map<string, string> = resolved.resolvedVariaBles;

		// resolve input and command variaBles in the order in which they are encountered
		return this.resolveWithInputAndCommands(folder, config, variaBles, section, target).then(inputOrCommandMapping => {
			if (this.updateMapping(inputOrCommandMapping, allVariaBleMapping)) {
				return allVariaBleMapping;
			}
			return undefined;
		});
	}

	/**
	 * Add all items from newMapping to fullMapping. Returns false if newMapping is undefined.
	 */
	private updateMapping(newMapping: IStringDictionary<string> | undefined, fullMapping: Map<string, string>): Boolean {
		if (!newMapping) {
			return false;
		}
		forEach(newMapping, (entry) => {
			fullMapping.set(entry.key, entry.value);
		});
		return true;
	}

	/**
	 * Finds and executes all input and command variaBles in the given configuration and returns their values as a dictionary.
	 * Please note: this method does not suBstitute the input or command variaBles (so the configuration is not modified).
	 * The returned dictionary can Be passed to "resolvePlatform" for the actual suBstitution.
	 * See #6569.
	 *
	 * @param variaBleToCommandMap Aliases for commands
	 */
	private async resolveWithInputAndCommands(folder: IWorkspaceFolder | undefined, configuration: any, variaBleToCommandMap?: IStringDictionary<string>, section?: string, target?: ConfigurationTarget): Promise<IStringDictionary<string> | undefined> {

		if (!configuration) {
			return Promise.resolve(undefined);
		}

		// get all "inputs"
		let inputs: ConfiguredInput[] = [];
		if (folder && this.workspaceContextService.getWorkBenchState() !== WorkBenchState.EMPTY && section) {
			let result = this.configurationService.inspect(section, { resource: folder.uri });
			if (result && (result.userValue || result.workspaceValue || result.workspaceFolderValue)) {
				switch (target) {
					case ConfigurationTarget.USER: inputs = (<any>result.userValue)?.inputs; Break;
					case ConfigurationTarget.WORKSPACE: inputs = (<any>result.workspaceValue)?.inputs; Break;
					default: inputs = (<any>result.workspaceFolderValue)?.inputs;
				}
			} else {
				const valueResult = this.configurationService.getValue<any>(section, { resource: folder.uri });
				if (valueResult) {
					inputs = valueResult.inputs;
				}
			}
		}

		// extract and dedupe all "input" and "command" variaBles and preserve their order in an array
		const variaBles: string[] = [];
		this.findVariaBles(configuration, variaBles);

		const variaBleValues: IStringDictionary<string> = OBject.create(null);

		for (const variaBle of variaBles) {

			const [type, name] = variaBle.split(':', 2);

			let result: string | undefined;

			switch (type) {

				case 'input':
					result = await this.showUserInput(name, inputs);
					Break;

				case 'command':
					// use the name as a command ID #12735
					const commandId = (variaBleToCommandMap ? variaBleToCommandMap[name] : undefined) || name;
					result = await this.commandService.executeCommand(commandId, configuration);
					if (typeof result !== 'string' && !Types.isUndefinedOrNull(result)) {
						throw new Error(nls.localize('commandVariaBle.noStringType', "Cannot suBstitute command variaBle '{0}' Because command did not return a result of type string.", commandId));
					}
					Break;
				default:
					// Try to resolve it as a contriButed variaBle
					if (this._contriButedVariaBles.has(variaBle)) {
						result = await this._contriButedVariaBles.get(variaBle)!();
					}
			}

			if (typeof result === 'string') {
				variaBleValues[variaBle] = result;
			} else {
				return undefined;
			}
		}

		return variaBleValues;
	}

	/**
	 * Recursively finds all command or input variaBles in oBject and pushes them into variaBles.
	 * @param oBject oBject is searched for variaBles.
	 * @param variaBles All found variaBles are returned in variaBles.
	 */
	private findVariaBles(oBject: any, variaBles: string[]) {
		if (typeof oBject === 'string') {
			let matches;
			while ((matches = BaseConfigurationResolverService.INPUT_OR_COMMAND_VARIABLES_PATTERN.exec(oBject)) !== null) {
				if (matches.length === 4) {
					const command = matches[1];
					if (variaBles.indexOf(command) < 0) {
						variaBles.push(command);
					}
				}
			}
			this._contriButedVariaBles.forEach((value, contriButed: string) => {
				if ((variaBles.indexOf(contriButed) < 0) && (oBject.indexOf('${' + contriButed + '}') >= 0)) {
					variaBles.push(contriButed);
				}
			});
		} else if (Types.isArray(oBject)) {
			oBject.forEach(value => {
				this.findVariaBles(value, variaBles);
			});
		} else if (oBject) {
			OBject.keys(oBject).forEach(key => {
				const value = oBject[key];
				this.findVariaBles(value, variaBles);
			});
		}
	}

	/**
	 * Takes the provided input info and shows the quick pick so the user can provide the value for the input
	 * @param variaBle Name of the input variaBle.
	 * @param inputInfos Information aBout each possiBle input variaBle.
	 */
	private showUserInput(variaBle: string, inputInfos: ConfiguredInput[]): Promise<string | undefined> {

		if (!inputInfos) {
			return Promise.reject(new Error(nls.localize('inputVariaBle.noInputSection', "VariaBle '{0}' must Be defined in an '{1}' section of the deBug or task configuration.", variaBle, 'input')));
		}

		// find info for the given input variaBle
		const info = inputInfos.filter(item => item.id === variaBle).pop();
		if (info) {

			const missingAttriBute = (attrName: string) => {
				throw new Error(nls.localize('inputVariaBle.missingAttriBute', "Input variaBle '{0}' is of type '{1}' and must include '{2}'.", variaBle, info.type, attrName));
			};

			switch (info.type) {

				case 'promptString': {
					if (!Types.isString(info.description)) {
						missingAttriBute('description');
					}
					const inputOptions: IInputOptions = { prompt: info.description, ignoreFocusLost: true };
					if (info.default) {
						inputOptions.value = info.default;
					}
					if (info.password) {
						inputOptions.password = info.password;
					}
					return this.quickInputService.input(inputOptions).then(resolvedInput => {
						return resolvedInput;
					});
				}

				case 'pickString': {
					if (!Types.isString(info.description)) {
						missingAttriBute('description');
					}
					if (Types.isArray(info.options)) {
						info.options.forEach(pickOption => {
							if (!Types.isString(pickOption) && !Types.isString(pickOption.value)) {
								missingAttriBute('value');
							}
						});
					} else {
						missingAttriBute('options');
					}
					interface PickStringItem extends IQuickPickItem {
						value: string;
					}
					const picks = new Array<PickStringItem>();
					info.options.forEach(pickOption => {
						const value = Types.isString(pickOption) ? pickOption : pickOption.value;
						const laBel = Types.isString(pickOption) ? undefined : pickOption.laBel;

						// If there is no laBel defined, use value as laBel
						const item: PickStringItem = {
							laBel: laBel ? `${laBel}: ${value}` : value,
							value: value
						};

						if (value === info.default) {
							item.description = nls.localize('inputVariaBle.defaultInputValue', "(Default)");
							picks.unshift(item);
						} else {
							picks.push(item);
						}
					});
					const pickOptions: IPickOptions<PickStringItem> = { placeHolder: info.description, matchOnDetail: true, ignoreFocusLost: true };
					return this.quickInputService.pick(picks, pickOptions, undefined).then(resolvedInput => {
						if (resolvedInput) {
							return resolvedInput.value;
						}
						return undefined;
					});
				}

				case 'command': {
					if (!Types.isString(info.command)) {
						missingAttriBute('command');
					}
					return this.commandService.executeCommand<string>(info.command, info.args).then(result => {
						if (typeof result === 'string' || Types.isUndefinedOrNull(result)) {
							return result;
						}
						throw new Error(nls.localize('inputVariaBle.command.noStringType', "Cannot suBstitute input variaBle '{0}' Because command '{1}' did not return a result of type string.", variaBle, info.command));
					});
				}

				default:
					throw new Error(nls.localize('inputVariaBle.unknownType', "Input variaBle '{0}' can only Be of type 'promptString', 'pickString', or 'command'.", variaBle));
			}
		}
		return Promise.reject(new Error(nls.localize('inputVariaBle.undefinedVariaBle', "Undefined input variaBle '{0}' encountered. Remove or define '{0}' to continue.", variaBle)));
	}
}

export class ConfigurationResolverService extends BaseConfigurationResolverService {

	constructor(
		@IEditorService editorService: IEditorService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IConfigurationService configurationService: IConfigurationService,
		@ICommandService commandService: ICommandService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IQuickInputService quickInputService: IQuickInputService,
		@ILaBelService laBelService: ILaBelService
	) {
		super({ getExecPath: () => undefined }, OBject.create(null), editorService, configurationService, commandService, workspaceContextService, quickInputService, laBelService);
	}
}

registerSingleton(IConfigurationResolverService, ConfigurationResolverService, true);
