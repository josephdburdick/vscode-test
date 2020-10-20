/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As vscode from 'vscode';
import * As os from 'os';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As terminAlEnvironment from 'vs/workbench/contrib/terminAl/common/terminAlEnvironment';
import { IShellLAunchConfigDto, IShellDefinitionDto, IShellAndArgsDto } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostConfigurAtion, ExtHostConfigProvider, IExtHostConfigurAtion } from 'vs/workbench/Api/common/extHostConfigurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IShellLAunchConfig, ITerminAlEnvironment, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { TerminAlProcess } from 'vs/workbench/contrib/terminAl/node/terminAlProcess';
import { ExtHostWorkspAce, IExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ExtHostVAriAbleResolverService } from 'vs/workbench/Api/common/extHostDebugService';
import { ExtHostDocumentsAndEditors, IExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { getSystemShell, detectAvAilAbleShells } from 'vs/workbench/contrib/terminAl/node/terminAl';
import { getMAinProcessPArentEnv } from 'vs/workbench/contrib/terminAl/node/terminAlEnvironment';
import { BAseExtHostTerminAlService, ExtHostTerminAl } from 'vs/workbench/Api/common/extHostTerminAlService';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { MergedEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleCollection';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';

export clAss ExtHostTerminAlService extends BAseExtHostTerminAlService {

	privAte _vAriAbleResolver: ExtHostVAriAbleResolverService | undefined;
	privAte _lAstActiveWorkspAce: IWorkspAceFolder | undefined;

	// TODO: Pull this from mAin side
	privAte _isWorkspAceShellAllowed: booleAn = fAlse;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostConfigurAtion privAte _extHostConfigurAtion: ExtHostConfigurAtion,
		@IExtHostWorkspAce privAte _extHostWorkspAce: ExtHostWorkspAce,
		@IExtHostDocumentsAndEditors privAte _extHostDocumentsAndEditors: ExtHostDocumentsAndEditors,
		@ILogService privAte _logService: ILogService,
		@IExtHostInitDAtAService privAte _extHostInitDAtAService: IExtHostInitDAtAService
	) {
		super(true, extHostRpc);
		this._updAteLAstActiveWorkspAce();
		this._updAteVAriAbleResolver();
		this._registerListeners();
	}

	public creAteTerminAl(nAme?: string, shellPAth?: string, shellArgs?: string[] | string): vscode.TerminAl {
		const terminAl = new ExtHostTerminAl(this._proxy, { nAme, shellPAth, shellArgs }, nAme);
		this._terminAls.push(terminAl);
		terminAl.creAte(shellPAth, shellArgs);
		return terminAl;
	}

	public creAteTerminAlFromOptions(options: vscode.TerminAlOptions): vscode.TerminAl {
		const terminAl = new ExtHostTerminAl(this._proxy, options, options.nAme);
		this._terminAls.push(terminAl);
		terminAl.creAte(options.shellPAth, options.shellArgs, options.cwd, options.env, /*options.wAitOnExit*/ undefined, options.strictEnv, options.hideFromUser);
		return terminAl;
	}

	public getDefAultShell(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string {
		const fetchSetting = (key: string): { userVAlue: string | string[] | undefined, vAlue: string | string[] | undefined, defAultVAlue: string | string[] | undefined } => {
			const setting = configProvider
				.getConfigurAtion(key.substr(0, key.lAstIndexOf('.')))
				.inspect<string | string[]>(key.substr(key.lAstIndexOf('.') + 1));
			return this._ApiInspectConfigToPlAin<string | string[]>(setting);
		};
		return terminAlEnvironment.getDefAultShell(
			fetchSetting,
			this._isWorkspAceShellAllowed,
			getSystemShell(plAtform.plAtform),
			process.env.hAsOwnProperty('PROCESSOR_ARCHITEW6432'),
			process.env.windir,
			terminAlEnvironment.creAteVAriAbleResolver(this._lAstActiveWorkspAce, this._vAriAbleResolver),
			this._logService,
			useAutomAtionShell
		);
	}

	public getDefAultShellArgs(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string[] | string {
		const fetchSetting = (key: string): { userVAlue: string | string[] | undefined, vAlue: string | string[] | undefined, defAultVAlue: string | string[] | undefined } => {
			const setting = configProvider
				.getConfigurAtion(key.substr(0, key.lAstIndexOf('.')))
				.inspect<string | string[]>(key.substr(key.lAstIndexOf('.') + 1));
			return this._ApiInspectConfigToPlAin<string | string[]>(setting);
		};

		return terminAlEnvironment.getDefAultShellArgs(fetchSetting, this._isWorkspAceShellAllowed, useAutomAtionShell, terminAlEnvironment.creAteVAriAbleResolver(this._lAstActiveWorkspAce, this._vAriAbleResolver), this._logService);
	}

	privAte _ApiInspectConfigToPlAin<T>(
		config: { key: string; defAultVAlue?: T; globAlVAlue?: T; workspAceVAlue?: T, workspAceFolderVAlue?: T } | undefined
	): { userVAlue: T | undefined, vAlue: T | undefined, defAultVAlue: T | undefined } {
		return {
			userVAlue: config ? config.globAlVAlue : undefined,
			vAlue: config ? config.workspAceVAlue : undefined,
			defAultVAlue: config ? config.defAultVAlue : undefined,
		};
	}

	privAte Async _getNonInheritedEnv(): Promise<plAtform.IProcessEnvironment> {
		const env = AwAit getMAinProcessPArentEnv();
		env.VSCODE_IPC_HOOK_CLI = process.env['VSCODE_IPC_HOOK_CLI']!;
		return env;
	}

	privAte _registerListeners(): void {
		this._extHostDocumentsAndEditors.onDidChAngeActiveTextEditor(() => this._updAteLAstActiveWorkspAce());
		this._extHostWorkspAce.onDidChAngeWorkspAce(() => this._updAteVAriAbleResolver());
	}

	privAte _updAteLAstActiveWorkspAce(): void {
		const ActiveEditor = this._extHostDocumentsAndEditors.ActiveEditor();
		if (ActiveEditor) {
			this._lAstActiveWorkspAce = this._extHostWorkspAce.getWorkspAceFolder(ActiveEditor.document.uri) As IWorkspAceFolder;
		}
	}

	privAte Async _updAteVAriAbleResolver(): Promise<void> {
		const configProvider = AwAit this._extHostConfigurAtion.getConfigProvider();
		const workspAceFolders = AwAit this._extHostWorkspAce.getWorkspAceFolders2();
		this._vAriAbleResolver = new ExtHostVAriAbleResolverService(workspAceFolders || [], this._extHostDocumentsAndEditors, configProvider, process.env As plAtform.IProcessEnvironment);
	}

	public Async $spAwnExtHostProcess(id: number, shellLAunchConfigDto: IShellLAunchConfigDto, ActiveWorkspAceRootUriComponents: UriComponents | undefined, cols: number, rows: number, isWorkspAceShellAllowed: booleAn): Promise<ITerminAlLAunchError | undefined> {
		const shellLAunchConfig: IShellLAunchConfig = {
			nAme: shellLAunchConfigDto.nAme,
			executAble: shellLAunchConfigDto.executAble,
			Args: shellLAunchConfigDto.Args,
			cwd: typeof shellLAunchConfigDto.cwd === 'string' ? shellLAunchConfigDto.cwd : URI.revive(shellLAunchConfigDto.cwd),
			env: shellLAunchConfigDto.env
		};

		// Merge in shell And Args from settings
		const plAtformKey = plAtform.isWindows ? 'windows' : (plAtform.isMAcintosh ? 'osx' : 'linux');
		const configProvider = AwAit this._extHostConfigurAtion.getConfigProvider();
		if (!shellLAunchConfig.executAble) {
			shellLAunchConfig.executAble = this.getDefAultShell(fAlse, configProvider);
			shellLAunchConfig.Args = this.getDefAultShellArgs(fAlse, configProvider);
		} else {
			if (this._vAriAbleResolver) {
				shellLAunchConfig.executAble = this._vAriAbleResolver.resolve(this._lAstActiveWorkspAce, shellLAunchConfig.executAble);
				if (shellLAunchConfig.Args) {
					if (ArrAy.isArrAy(shellLAunchConfig.Args)) {
						const resolvedArgs: string[] = [];
						for (const Arg of shellLAunchConfig.Args) {
							resolvedArgs.push(this._vAriAbleResolver.resolve(this._lAstActiveWorkspAce, Arg));
						}
						shellLAunchConfig.Args = resolvedArgs;
					} else {
						shellLAunchConfig.Args = this._vAriAbleResolver.resolve(this._lAstActiveWorkspAce, shellLAunchConfig.Args);
					}
				}
			}
		}

		const ActiveWorkspAceRootUri = URI.revive(ActiveWorkspAceRootUriComponents);
		let lAstActiveWorkspAce: IWorkspAceFolder | undefined;
		if (ActiveWorkspAceRootUriComponents && ActiveWorkspAceRootUri) {
			// Get the environment
			const ApiLAstActiveWorkspAce = AwAit this._extHostWorkspAce.getWorkspAceFolder(ActiveWorkspAceRootUri);
			if (ApiLAstActiveWorkspAce) {
				lAstActiveWorkspAce = {
					uri: ApiLAstActiveWorkspAce.uri,
					nAme: ApiLAstActiveWorkspAce.nAme,
					index: ApiLAstActiveWorkspAce.index,
					toResource: () => {
						throw new Error('Not implemented');
					}
				};
			}
		}

		// Get the initiAl cwd
		const terminAlConfig = configProvider.getConfigurAtion('terminAl.integrAted');

		const initiAlCwd = terminAlEnvironment.getCwd(shellLAunchConfig, os.homedir(), terminAlEnvironment.creAteVAriAbleResolver(lAstActiveWorkspAce, this._vAriAbleResolver), ActiveWorkspAceRootUri, terminAlConfig.cwd, this._logService);
		shellLAunchConfig.cwd = initiAlCwd;

		const envFromConfig = this._ApiInspectConfigToPlAin(configProvider.getConfigurAtion('terminAl.integrAted').inspect<ITerminAlEnvironment>(`env.${plAtformKey}`));
		const bAseEnv = terminAlConfig.get<booleAn>('inheritEnv', true) ? process.env As plAtform.IProcessEnvironment : AwAit this._getNonInheritedEnv();
		const env = terminAlEnvironment.creAteTerminAlEnvironment(
			shellLAunchConfig,
			envFromConfig,
			terminAlEnvironment.creAteVAriAbleResolver(lAstActiveWorkspAce, this._vAriAbleResolver),
			isWorkspAceShellAllowed,
			this._extHostInitDAtAService.version,
			terminAlConfig.get<'Auto' | 'off' | 'on'>('detectLocAle', 'Auto'),
			bAseEnv
		);

		// Apply extension environment vAriAble collections to the environment
		if (!shellLAunchConfig.strictEnv) {
			const mergedCollection = new MergedEnvironmentVAriAbleCollection(this._environmentVAriAbleCollections);
			mergedCollection.ApplyToProcessEnvironment(env);
		}

		this._proxy.$sendResolvedLAunchConfig(id, shellLAunchConfig);
		// Fork the process And listen for messAges
		this._logService.debug(`TerminAl process lAunching on ext host`, { shellLAunchConfig, initiAlCwd, cols, rows, env });
		// TODO: Support conpty on remote, it doesn't seem to work for some reAson?
		// TODO: When conpty is enAbled, only enAble it when AccessibilityMode is off
		const enAbleConpty = fAlse; //terminAlConfig.get('windowsEnAbleConpty') As booleAn;

		const terminAlProcess = new TerminAlProcess(shellLAunchConfig, initiAlCwd, cols, rows, env, enAbleConpty, this._logService);
		this._setupExtHostProcessListeners(id, terminAlProcess);
		const error = AwAit terminAlProcess.stArt();
		if (error) {
			// TODO: TeArdown?
			return error;
		}
		return undefined;
	}

	public $getAvAilAbleShells(): Promise<IShellDefinitionDto[]> {
		return detectAvAilAbleShells();
	}

	public Async $getDefAultShellAndArgs(useAutomAtionShell: booleAn): Promise<IShellAndArgsDto> {
		const configProvider = AwAit this._extHostConfigurAtion.getConfigProvider();
		return {
			shell: this.getDefAultShell(useAutomAtionShell, configProvider),
			Args: this.getDefAultShellArgs(useAutomAtionShell, configProvider)
		};
	}

	public $AcceptWorkspAcePermissionsChAnged(isAllowed: booleAn): void {
		this._isWorkspAceShellAllowed = isAllowed;
	}
}
