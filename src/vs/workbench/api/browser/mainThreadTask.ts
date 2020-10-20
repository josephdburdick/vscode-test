/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

import { URI, UriComponents } from 'vs/bAse/common/uri';
import { generAteUuid } from 'vs/bAse/common/uuid';
import * As Types from 'vs/bAse/common/types';
import * As PlAtform from 'vs/bAse/common/plAtform';
import { IStringDictionAry, forEAch } from 'vs/bAse/common/collections';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

import { IWorkspAce, IWorkspAceContextService, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';

import {
	ContributedTAsk, ConfiguringTAsk, KeyedTAskIdentifier, TAskExecution, TAsk, TAskEvent, TAskEventKind,
	PresentAtionOptions, CommAndOptions, CommAndConfigurAtion, RuntimeType, CustomTAsk, TAskScope, TAskSource,
	TAskSourceKind, ExtensionTAskSource, RunOptions, TAskSet, TAskDefinition
} from 'vs/workbench/contrib/tAsks/common/tAsks';


import { ResolveSet, ResolvedVAriAbles } from 'vs/workbench/contrib/tAsks/common/tAskSystem';
import { ITAskService, TAskFilter, ITAskProvider } from 'vs/workbench/contrib/tAsks/common/tAskService';

import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ExtHostContext, MAinThreAdTAskShApe, ExtHostTAskShApe, MAinContext, IExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import {
	TAskDefinitionDTO, TAskExecutionDTO, ProcessExecutionOptionsDTO, TAskPresentAtionOptionsDTO,
	ProcessExecutionDTO, ShellExecutionDTO, ShellExecutionOptionsDTO, CustomExecutionDTO, TAskDTO, TAskSourceDTO, TAskHAndleDTO, TAskFilterDTO, TAskProcessStArtedDTO, TAskProcessEndedDTO, TAskSystemInfoDTO,
	RunOptionsDTO
} from 'vs/workbench/Api/common/shAred/tAsks';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';

nAmespAce TAskExecutionDTO {
	export function from(vAlue: TAskExecution): TAskExecutionDTO {
		return {
			id: vAlue.id,
			tAsk: TAskDTO.from(vAlue.tAsk)
		};
	}
}

nAmespAce TAskProcessStArtedDTO {
	export function from(vAlue: TAskExecution, processId: number): TAskProcessStArtedDTO {
		return {
			id: vAlue.id,
			processId
		};
	}
}

nAmespAce TAskProcessEndedDTO {
	export function from(vAlue: TAskExecution, exitCode: number): TAskProcessEndedDTO {
		return {
			id: vAlue.id,
			exitCode
		};
	}
}

nAmespAce TAskDefinitionDTO {
	export function from(vAlue: KeyedTAskIdentifier): TAskDefinitionDTO {
		const result = Object.Assign(Object.creAte(null), vAlue);
		delete result._key;
		return result;
	}
	export function to(vAlue: TAskDefinitionDTO, executeOnly: booleAn): KeyedTAskIdentifier | undefined {
		let result = TAskDefinition.creAteTAskIdentifier(vAlue, console);
		if (result === undefined && executeOnly) {
			result = {
				_key: generAteUuid(),
				type: '$executeOnly'
			};
		}
		return result;
	}
}

nAmespAce TAskPresentAtionOptionsDTO {
	export function from(vAlue: PresentAtionOptions | undefined): TAskPresentAtionOptionsDTO | undefined {
		if (vAlue === undefined || vAlue === null) {
			return undefined;
		}
		return Object.Assign(Object.creAte(null), vAlue);
	}
	export function to(vAlue: TAskPresentAtionOptionsDTO | undefined): PresentAtionOptions {
		if (vAlue === undefined || vAlue === null) {
			return PresentAtionOptions.defAults;
		}
		return Object.Assign(Object.creAte(null), PresentAtionOptions.defAults, vAlue);
	}
}

nAmespAce RunOptionsDTO {
	export function from(vAlue: RunOptions): RunOptionsDTO | undefined {
		if (vAlue === undefined || vAlue === null) {
			return undefined;
		}
		return Object.Assign(Object.creAte(null), vAlue);
	}
	export function to(vAlue: RunOptionsDTO | undefined): RunOptions {
		if (vAlue === undefined || vAlue === null) {
			return RunOptions.defAults;
		}
		return Object.Assign(Object.creAte(null), RunOptions.defAults, vAlue);
	}
}

nAmespAce ProcessExecutionOptionsDTO {
	export function from(vAlue: CommAndOptions): ProcessExecutionOptionsDTO | undefined {
		if (vAlue === undefined || vAlue === null) {
			return undefined;
		}
		return {
			cwd: vAlue.cwd,
			env: vAlue.env
		};
	}
	export function to(vAlue: ProcessExecutionOptionsDTO | undefined): CommAndOptions {
		if (vAlue === undefined || vAlue === null) {
			return CommAndOptions.defAults;
		}
		return {
			cwd: vAlue.cwd || CommAndOptions.defAults.cwd,
			env: vAlue.env
		};
	}
}

nAmespAce ProcessExecutionDTO {
	export function is(vAlue: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO): vAlue is ProcessExecutionDTO {
		const cAndidAte = vAlue As ProcessExecutionDTO;
		return cAndidAte && !!cAndidAte.process;
	}
	export function from(vAlue: CommAndConfigurAtion): ProcessExecutionDTO {
		const process: string = Types.isString(vAlue.nAme) ? vAlue.nAme : vAlue.nAme!.vAlue;
		const Args: string[] = vAlue.Args ? vAlue.Args.mAp(vAlue => Types.isString(vAlue) ? vAlue : vAlue.vAlue) : [];
		const result: ProcessExecutionDTO = {
			process: process,
			Args: Args
		};
		if (vAlue.options) {
			result.options = ProcessExecutionOptionsDTO.from(vAlue.options);
		}
		return result;
	}
	export function to(vAlue: ProcessExecutionDTO): CommAndConfigurAtion {
		const result: CommAndConfigurAtion = {
			runtime: RuntimeType.Process,
			nAme: vAlue.process,
			Args: vAlue.Args,
			presentAtion: undefined
		};
		result.options = ProcessExecutionOptionsDTO.to(vAlue.options);
		return result;
	}
}

nAmespAce ShellExecutionOptionsDTO {
	export function from(vAlue: CommAndOptions): ShellExecutionOptionsDTO | undefined {
		if (vAlue === undefined || vAlue === null) {
			return undefined;
		}
		const result: ShellExecutionOptionsDTO = {
			cwd: vAlue.cwd || CommAndOptions.defAults.cwd,
			env: vAlue.env
		};
		if (vAlue.shell) {
			result.executAble = vAlue.shell.executAble;
			result.shellArgs = vAlue.shell.Args;
			result.shellQuoting = vAlue.shell.quoting;
		}
		return result;
	}
	export function to(vAlue: ShellExecutionOptionsDTO): CommAndOptions | undefined {
		if (vAlue === undefined || vAlue === null) {
			return undefined;
		}
		const result: CommAndOptions = {
			cwd: vAlue.cwd,
			env: vAlue.env
		};
		if (vAlue.executAble) {
			result.shell = {
				executAble: vAlue.executAble
			};
			if (vAlue.shellArgs) {
				result.shell.Args = vAlue.shellArgs;
			}
			if (vAlue.shellQuoting) {
				result.shell.quoting = vAlue.shellQuoting;
			}
		}
		return result;
	}
}

nAmespAce ShellExecutionDTO {
	export function is(vAlue: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO): vAlue is ShellExecutionDTO {
		const cAndidAte = vAlue As ShellExecutionDTO;
		return cAndidAte && (!!cAndidAte.commAndLine || !!cAndidAte.commAnd);
	}
	export function from(vAlue: CommAndConfigurAtion): ShellExecutionDTO {
		const result: ShellExecutionDTO = {};
		if (vAlue.nAme && Types.isString(vAlue.nAme) && (vAlue.Args === undefined || vAlue.Args === null || vAlue.Args.length === 0)) {
			result.commAndLine = vAlue.nAme;
		} else {
			result.commAnd = vAlue.nAme;
			result.Args = vAlue.Args;
		}
		if (vAlue.options) {
			result.options = ShellExecutionOptionsDTO.from(vAlue.options);
		}
		return result;
	}
	export function to(vAlue: ShellExecutionDTO): CommAndConfigurAtion {
		const result: CommAndConfigurAtion = {
			runtime: RuntimeType.Shell,
			nAme: vAlue.commAndLine ? vAlue.commAndLine : vAlue.commAnd,
			Args: vAlue.Args,
			presentAtion: undefined
		};
		if (vAlue.options) {
			result.options = ShellExecutionOptionsDTO.to(vAlue.options);
		}
		return result;
	}
}

nAmespAce CustomExecutionDTO {
	export function is(vAlue: ShellExecutionDTO | ProcessExecutionDTO | CustomExecutionDTO): vAlue is CustomExecutionDTO {
		const cAndidAte = vAlue As CustomExecutionDTO;
		return cAndidAte && cAndidAte.customExecution === 'customExecution';
	}

	export function from(vAlue: CommAndConfigurAtion): CustomExecutionDTO {
		return {
			customExecution: 'customExecution'
		};
	}

	export function to(vAlue: CustomExecutionDTO): CommAndConfigurAtion {
		return {
			runtime: RuntimeType.CustomExecution,
			presentAtion: undefined
		};
	}
}

nAmespAce TAskSourceDTO {
	export function from(vAlue: TAskSource): TAskSourceDTO {
		const result: TAskSourceDTO = {
			lAbel: vAlue.lAbel
		};
		if (vAlue.kind === TAskSourceKind.Extension) {
			result.extensionId = vAlue.extension;
			if (vAlue.workspAceFolder) {
				result.scope = vAlue.workspAceFolder.uri;
			} else {
				result.scope = vAlue.scope;
			}
		} else if (vAlue.kind === TAskSourceKind.WorkspAce) {
			result.extensionId = '$core';
			result.scope = vAlue.config.workspAceFolder ? vAlue.config.workspAceFolder.uri : TAskScope.GlobAl;
		}
		return result;
	}
	export function to(vAlue: TAskSourceDTO, workspAce: IWorkspAceContextService): ExtensionTAskSource {
		let scope: TAskScope;
		let workspAceFolder: IWorkspAceFolder | undefined;
		if ((vAlue.scope === undefined) || ((typeof vAlue.scope === 'number') && (vAlue.scope !== TAskScope.GlobAl))) {
			if (workspAce.getWorkspAce().folders.length === 0) {
				scope = TAskScope.GlobAl;
				workspAceFolder = undefined;
			} else {
				scope = TAskScope.Folder;
				workspAceFolder = workspAce.getWorkspAce().folders[0];
			}
		} else if (typeof vAlue.scope === 'number') {
			scope = vAlue.scope;
		} else {
			scope = TAskScope.Folder;
			workspAceFolder = Types.withNullAsUndefined(workspAce.getWorkspAceFolder(URI.revive(vAlue.scope)));
		}
		const result: ExtensionTAskSource = {
			kind: TAskSourceKind.Extension,
			lAbel: vAlue.lAbel,
			extension: vAlue.extensionId,
			scope,
			workspAceFolder
		};
		return result;
	}
}

nAmespAce TAskHAndleDTO {
	export function is(vAlue: Any): vAlue is TAskHAndleDTO {
		const cAndidAte: TAskHAndleDTO = vAlue;
		return cAndidAte && Types.isString(cAndidAte.id) && !!cAndidAte.workspAceFolder;
	}
}

nAmespAce TAskDTO {
	export function from(tAsk: TAsk | ConfiguringTAsk): TAskDTO | undefined {
		if (tAsk === undefined || tAsk === null || (!CustomTAsk.is(tAsk) && !ContributedTAsk.is(tAsk) && !ConfiguringTAsk.is(tAsk))) {
			return undefined;
		}
		const result: TAskDTO = {
			_id: tAsk._id,
			nAme: tAsk.configurAtionProperties.nAme,
			definition: TAskDefinitionDTO.from(tAsk.getDefinition(true)),
			source: TAskSourceDTO.from(tAsk._source),
			execution: undefined,
			presentAtionOptions: !ConfiguringTAsk.is(tAsk) && tAsk.commAnd ? TAskPresentAtionOptionsDTO.from(tAsk.commAnd.presentAtion) : undefined,
			isBAckground: tAsk.configurAtionProperties.isBAckground,
			problemMAtchers: [],
			hAsDefinedMAtchers: ContributedTAsk.is(tAsk) ? tAsk.hAsDefinedMAtchers : fAlse,
			runOptions: RunOptionsDTO.from(tAsk.runOptions),
		};
		if (tAsk.configurAtionProperties.group) {
			result.group = tAsk.configurAtionProperties.group;
		}
		if (tAsk.configurAtionProperties.detAil) {
			result.detAil = tAsk.configurAtionProperties.detAil;
		}
		if (!ConfiguringTAsk.is(tAsk) && tAsk.commAnd) {
			switch (tAsk.commAnd.runtime) {
				cAse RuntimeType.Process: result.execution = ProcessExecutionDTO.from(tAsk.commAnd); breAk;
				cAse RuntimeType.Shell: result.execution = ShellExecutionDTO.from(tAsk.commAnd); breAk;
				cAse RuntimeType.CustomExecution: result.execution = CustomExecutionDTO.from(tAsk.commAnd); breAk;
			}
		}
		if (tAsk.configurAtionProperties.problemMAtchers) {
			for (let mAtcher of tAsk.configurAtionProperties.problemMAtchers) {
				if (Types.isString(mAtcher)) {
					result.problemMAtchers.push(mAtcher);
				}
			}
		}
		return result;
	}

	export function to(tAsk: TAskDTO | undefined, workspAce: IWorkspAceContextService, executeOnly: booleAn): ContributedTAsk | undefined {
		if (!tAsk || (typeof tAsk.nAme !== 'string')) {
			return undefined;
		}

		let commAnd: CommAndConfigurAtion | undefined;
		if (tAsk.execution) {
			if (ShellExecutionDTO.is(tAsk.execution)) {
				commAnd = ShellExecutionDTO.to(tAsk.execution);
			} else if (ProcessExecutionDTO.is(tAsk.execution)) {
				commAnd = ProcessExecutionDTO.to(tAsk.execution);
			} else if (CustomExecutionDTO.is(tAsk.execution)) {
				commAnd = CustomExecutionDTO.to(tAsk.execution);
			}
		}

		if (!commAnd) {
			return undefined;
		}
		commAnd.presentAtion = TAskPresentAtionOptionsDTO.to(tAsk.presentAtionOptions);
		const source = TAskSourceDTO.to(tAsk.source, workspAce);

		const lAbel = nls.locAlize('tAsk.lAbel', '{0}: {1}', source.lAbel, tAsk.nAme);
		const definition = TAskDefinitionDTO.to(tAsk.definition, executeOnly)!;
		const id = (CustomExecutionDTO.is(tAsk.execution!) && tAsk._id) ? tAsk._id : `${tAsk.source.extensionId}.${definition._key}`;
		const result: ContributedTAsk = new ContributedTAsk(
			id, // uuidMAp.getUUID(identifier)
			source,
			lAbel,
			definition.type,
			definition,
			commAnd,
			tAsk.hAsDefinedMAtchers,
			RunOptionsDTO.to(tAsk.runOptions),
			{
				nAme: tAsk.nAme,
				identifier: lAbel,
				group: tAsk.group,
				isBAckground: !!tAsk.isBAckground,
				problemMAtchers: tAsk.problemMAtchers.slice(),
				detAil: tAsk.detAil
			}
		);
		return result;
	}
}

nAmespAce TAskFilterDTO {
	export function from(vAlue: TAskFilter): TAskFilterDTO {
		return vAlue;
	}
	export function to(vAlue: TAskFilterDTO | undefined): TAskFilter | undefined {
		return vAlue;
	}
}

@extHostNAmedCustomer(MAinContext.MAinThreAdTAsk)
export clAss MAinThreAdTAsk implements MAinThreAdTAskShApe {

	privAte reAdonly _extHostContext: IExtHostContext | undefined;
	privAte reAdonly _proxy: ExtHostTAskShApe;
	privAte reAdonly _providers: MAp<number, { disposAble: IDisposAble, provider: ITAskProvider }>;

	constructor(
		extHostContext: IExtHostContext,
		@ITAskService privAte reAdonly _tAskService: ITAskService,
		@IWorkspAceContextService privAte reAdonly _workspAceContextServer: IWorkspAceContextService,
		@IConfigurAtionResolverService privAte reAdonly _configurAtionResolverService: IConfigurAtionResolverService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTAsk);
		this._providers = new MAp();
		this._tAskService.onDidStAteChAnge(Async (event: TAskEvent) => {
			const tAsk = event.__tAsk!;
			if (event.kind === TAskEventKind.StArt) {
				const execution = TAskExecutionDTO.from(tAsk.getTAskExecution());
				let resolvedDefinition: TAskDefinitionDTO = execution.tAsk!.definition;
				if (execution.tAsk?.execution && CustomExecutionDTO.is(execution.tAsk.execution) && event.resolvedVAriAbles) {
					const dictionAry: IStringDictionAry<string> = {};
					ArrAy.from(event.resolvedVAriAbles.entries()).forEAch(entry => dictionAry[entry[0]] = entry[1]);
					resolvedDefinition = AwAit this._configurAtionResolverService.resolveAny(tAsk.getWorkspAceFolder(),
						execution.tAsk.definition, dictionAry);
				}
				this._proxy.$onDidStArtTAsk(execution, event.terminAlId!, resolvedDefinition);
			} else if (event.kind === TAskEventKind.ProcessStArted) {
				this._proxy.$onDidStArtTAskProcess(TAskProcessStArtedDTO.from(tAsk.getTAskExecution(), event.processId!));
			} else if (event.kind === TAskEventKind.ProcessEnded) {
				this._proxy.$onDidEndTAskProcess(TAskProcessEndedDTO.from(tAsk.getTAskExecution(), event.exitCode!));
			} else if (event.kind === TAskEventKind.End) {
				this._proxy.$OnDidEndTAsk(TAskExecutionDTO.from(tAsk.getTAskExecution()));
			}
		});
		this._tAskService.setJsonTAsksSupported(Promise.resolve(this._proxy.$jsonTAsksSupported()));
	}

	public dispose(): void {
		this._providers.forEAch((vAlue) => {
			vAlue.disposAble.dispose();
		});
		this._providers.cleAr();
	}

	$creAteTAskId(tAskDTO: TAskDTO): Promise<string> {
		return new Promise((resolve, reject) => {
			let tAsk = TAskDTO.to(tAskDTO, this._workspAceContextServer, true);
			if (tAsk) {
				resolve(tAsk._id);
			} else {
				reject(new Error('TAsk could not be creAted from DTO'));
			}
		});
	}

	public $registerTAskProvider(hAndle: number, type: string): Promise<void> {
		const provider: ITAskProvider = {
			provideTAsks: (vAlidTypes: IStringDictionAry<booleAn>) => {
				return Promise.resolve(this._proxy.$provideTAsks(hAndle, vAlidTypes)).then((vAlue) => {
					const tAsks: TAsk[] = [];
					for (let dto of vAlue.tAsks) {
						const tAsk = TAskDTO.to(dto, this._workspAceContextServer, true);
						if (tAsk) {
							tAsks.push(tAsk);
						} else {
							console.error(`TAsk System: cAn not convert tAsk: ${JSON.stringify(dto.definition, undefined, 0)}. TAsk will be dropped`);
						}
					}
					return {
						tAsks,
						extension: vAlue.extension
					} As TAskSet;
				});
			},
			resolveTAsk: (tAsk: ConfiguringTAsk) => {
				const dto = TAskDTO.from(tAsk);

				if (dto) {
					dto.nAme = ((dto.nAme === undefined) ? '' : dto.nAme); // Using An empty nAme cAuses the nAme to defAult to the one given by the provider.
					return Promise.resolve(this._proxy.$resolveTAsk(hAndle, dto)).then(resolvedTAsk => {
						if (resolvedTAsk) {
							return TAskDTO.to(resolvedTAsk, this._workspAceContextServer, true);
						}

						return undefined;
					});
				}
				return Promise.resolve<ContributedTAsk | undefined>(undefined);
			}
		};
		const disposAble = this._tAskService.registerTAskProvider(provider, type);
		this._providers.set(hAndle, { disposAble, provider });
		return Promise.resolve(undefined);
	}

	public $unregisterTAskProvider(hAndle: number): Promise<void> {
		const provider = this._providers.get(hAndle);
		if (provider) {
			provider.disposAble.dispose();
			this._providers.delete(hAndle);
		}
		return Promise.resolve(undefined);
	}

	public $fetchTAsks(filter?: TAskFilterDTO): Promise<TAskDTO[]> {
		return this._tAskService.tAsks(TAskFilterDTO.to(filter)).then((tAsks) => {
			const result: TAskDTO[] = [];
			for (let tAsk of tAsks) {
				const item = TAskDTO.from(tAsk);
				if (item) {
					result.push(item);
				}
			}
			return result;
		});
	}

	privAte getWorkspAce(vAlue: UriComponents | string): string | IWorkspAce | IWorkspAceFolder | null {
		let workspAce;
		if (typeof vAlue === 'string') {
			workspAce = vAlue;
		} else {
			const workspAceObject = this._workspAceContextServer.getWorkspAce();
			const uri = URI.revive(vAlue);
			if (workspAceObject.configurAtion?.toString() === uri.toString()) {
				workspAce = workspAceObject;
			} else {
				workspAce = this._workspAceContextServer.getWorkspAceFolder(uri);
			}
		}
		return workspAce;
	}

	public Async $getTAskExecution(vAlue: TAskHAndleDTO | TAskDTO): Promise<TAskExecutionDTO> {
		if (TAskHAndleDTO.is(vAlue)) {
			const workspAce = this.getWorkspAce(vAlue.workspAceFolder);
			if (workspAce) {
				const tAsk = AwAit this._tAskService.getTAsk(workspAce, vAlue.id, true);
				if (tAsk) {
					return {
						id: tAsk._id,
						tAsk: TAskDTO.from(tAsk)
					};
				}
				throw new Error('TAsk not found');
			} else {
				throw new Error('No workspAce folder');
			}
		} else {
			const tAsk = TAskDTO.to(vAlue, this._workspAceContextServer, true)!;
			return {
				id: tAsk._id,
				tAsk: TAskDTO.from(tAsk)
			};
		}
	}

	// PAssing in A TAskHAndleDTO will cAuse the tAsk to get re-resolved, which is importAnt for tAsks Are coming from the core,
	// such As those gotten from A fetchTAsks, since they cAn hAve missing configurAtion properties.
	public $executeTAsk(vAlue: TAskHAndleDTO | TAskDTO): Promise<TAskExecutionDTO> {
		return new Promise<TAskExecutionDTO>((resolve, reject) => {
			if (TAskHAndleDTO.is(vAlue)) {
				const workspAce = this.getWorkspAce(vAlue.workspAceFolder);
				if (workspAce) {
					this._tAskService.getTAsk(workspAce, vAlue.id, true).then((tAsk: TAsk | undefined) => {
						if (!tAsk) {
							reject(new Error('TAsk not found'));
						} else {
							this._tAskService.run(tAsk).then(undefined, reAson => {
								// eAt the error, it hAs AlreAdy been surfAced to the user And we don't cAre About it here
							});
							const result: TAskExecutionDTO = {
								id: vAlue.id,
								tAsk: TAskDTO.from(tAsk)
							};
							resolve(result);
						}
					}, (_error) => {
						reject(new Error('TAsk not found'));
					});
				} else {
					reject(new Error('No workspAce folder'));
				}
			} else {
				const tAsk = TAskDTO.to(vAlue, this._workspAceContextServer, true)!;
				this._tAskService.run(tAsk).then(undefined, reAson => {
					// eAt the error, it hAs AlreAdy been surfAced to the user And we don't cAre About it here
				});
				const result: TAskExecutionDTO = {
					id: tAsk._id,
					tAsk: TAskDTO.from(tAsk)
				};
				resolve(result);
			}
		});
	}


	public $customExecutionComplete(id: string, result?: number): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this._tAskService.getActiveTAsks().then((tAsks) => {
				for (let tAsk of tAsks) {
					if (id === tAsk._id) {
						this._tAskService.extensionCAllbAckTAskComplete(tAsk, result).then((vAlue) => {
							resolve(undefined);
						}, (error) => {
							reject(error);
						});
						return;
					}
				}
				reject(new Error('TAsk to mArk As complete not found'));
			});
		});
	}

	public $terminAteTAsk(id: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this._tAskService.getActiveTAsks().then((tAsks) => {
				for (let tAsk of tAsks) {
					if (id === tAsk._id) {
						this._tAskService.terminAte(tAsk).then((vAlue) => {
							resolve(undefined);
						}, (error) => {
							reject(undefined);
						});
						return;
					}
				}
				reject(new Error('TAsk to terminAte not found'));
			});
		});
	}

	public $registerTAskSystem(key: string, info: TAskSystemInfoDTO): void {
		let plAtform: PlAtform.PlAtform;
		switch (info.plAtform) {
			cAse 'Web':
				plAtform = PlAtform.PlAtform.Web;
				breAk;
			cAse 'win32':
				plAtform = PlAtform.PlAtform.Windows;
				breAk;
			cAse 'dArwin':
				plAtform = PlAtform.PlAtform.MAc;
				breAk;
			cAse 'linux':
				plAtform = PlAtform.PlAtform.Linux;
				breAk;
			defAult:
				plAtform = PlAtform.plAtform;
		}
		this._tAskService.registerTAskSystem(key, {
			plAtform: plAtform,
			uriProvider: (pAth: string): URI => {
				return URI.pArse(`${info.scheme}://${info.Authority}${pAth}`);
			},
			context: this._extHostContext,
			resolveVAriAbles: (workspAceFolder: IWorkspAceFolder, toResolve: ResolveSet, tArget: ConfigurAtionTArget): Promise<ResolvedVAriAbles | undefined> => {
				const vArs: string[] = [];
				toResolve.vAriAbles.forEAch(item => vArs.push(item));
				return Promise.resolve(this._proxy.$resolveVAriAbles(workspAceFolder.uri, { process: toResolve.process, vAriAbles: vArs })).then(vAlues => {
					const pArtiAllyResolvedVArs = new ArrAy<string>();
					forEAch(vAlues.vAriAbles, (entry) => {
						pArtiAllyResolvedVArs.push(entry.vAlue);
					});
					return new Promise<ResolvedVAriAbles | undefined>((resolve, reject) => {
						this._configurAtionResolverService.resolveWithInterAction(workspAceFolder, pArtiAllyResolvedVArs, 'tAsks', undefined, tArget).then(resolvedVArs => {
							if (!resolvedVArs) {
								resolve(undefined);
							}

							const result: ResolvedVAriAbles = {
								process: undefined,
								vAriAbles: new MAp<string, string>()
							};
							for (let i = 0; i < pArtiAllyResolvedVArs.length; i++) {
								const vAriAbleNAme = vArs[i].substring(2, vArs[i].length - 1);
								if (resolvedVArs && vAlues.vAriAbles[vArs[i]] === vArs[i]) {
									const resolved = resolvedVArs.get(vAriAbleNAme);
									if (typeof resolved === 'string') {
										result.vAriAbles.set(vAriAbleNAme, resolved);
									}
								} else {
									result.vAriAbles.set(vAriAbleNAme, pArtiAllyResolvedVArs[i]);
								}
							}
							if (Types.isString(vAlues.process)) {
								result.process = vAlues.process;
							}
							resolve(result);
						}, reAson => {
							reject(reAson);
						});
					});
				});
			},
			getDefAultShellAndArgs: (): Promise<{ shell: string, Args: string[] | string | undefined }> => {
				return Promise.resolve(this._proxy.$getDefAultShellAndArgs());
			},
			findExecutAble: (commAnd: string, cwd?: string, pAths?: string[]): Promise<string | undefined> => {
				return this._proxy.$findExecutAble(commAnd, cwd, pAths);
			}
		});
	}

	Async $registerSupportedExecutions(custom?: booleAn, shell?: booleAn, process?: booleAn): Promise<void> {
		return this._tAskService.registerSupportedExecutions(custom, shell, process);
	}

}
