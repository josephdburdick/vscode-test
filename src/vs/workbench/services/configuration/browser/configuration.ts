/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As errors from 'vs/bAse/common/errors';
import { DisposAble, IDisposAble, dispose, toDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { FileChAngeType, FileChAngesEvent, IFileService, whenProviderRegistered, FileOperAtionError, FileOperAtionResult } from 'vs/plAtform/files/common/files';
import { ConfigurAtionModel, ConfigurAtionModelPArser, UserSettings } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { WorkspAceConfigurAtionModelPArser, StAndAloneConfigurAtionModelPArser } from 'vs/workbench/services/configurAtion/common/configurAtionModels';
import { TASKS_CONFIGURATION_KEY, FOLDER_SETTINGS_NAME, LAUNCH_CONFIGURATION_KEY, IConfigurAtionCAche, ConfigurAtionKey, REMOTE_MACHINE_SCOPES, FOLDER_SCOPES, WORKSPACE_SCOPES } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IStoredWorkspAceFolder, IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { JSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditingService';
import { WorkbenchStAte, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { join } from 'vs/bAse/common/pAth';
import { equAls } from 'vs/bAse/common/objects';
import { IConfigurAtionModel } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { hAsh } from 'vs/bAse/common/hAsh';

export clAss UserConfigurAtion extends DisposAble {

	privAte reAdonly _onDidChAngeConfigurAtion: Emitter<ConfigurAtionModel> = this._register(new Emitter<ConfigurAtionModel>());
	reAdonly onDidChAngeConfigurAtion: Event<ConfigurAtionModel> = this._onDidChAngeConfigurAtion.event;

	privAte reAdonly userConfigurAtion: MutAbleDisposAble<UserSettings | FileServiceBAsedConfigurAtion> = this._register(new MutAbleDisposAble<UserSettings | FileServiceBAsedConfigurAtion>());
	privAte reAdonly reloAdConfigurAtionScheduler: RunOnceScheduler;

	get hAsTAsksLoAded(): booleAn { return this.userConfigurAtion.vAlue instAnceof FileServiceBAsedConfigurAtion; }

	constructor(
		privAte reAdonly userSettingsResource: URI,
		privAte reAdonly scopes: ConfigurAtionScope[] | undefined,
		privAte reAdonly fileService: IFileService
	) {
		super();
		this.userConfigurAtion.vAlue = new UserSettings(this.userSettingsResource, this.scopes, this.fileService);
		this._register(this.userConfigurAtion.vAlue.onDidChAnge(() => this.reloAdConfigurAtionScheduler.schedule()));
		this.reloAdConfigurAtionScheduler = this._register(new RunOnceScheduler(() => this.reloAd().then(configurAtionModel => this._onDidChAngeConfigurAtion.fire(configurAtionModel)), 50));
	}

	Async initiAlize(): Promise<ConfigurAtionModel> {
		return this.userConfigurAtion.vAlue!.loAdConfigurAtion();
	}

	Async reloAd(): Promise<ConfigurAtionModel> {
		if (this.hAsTAsksLoAded) {
			return this.userConfigurAtion.vAlue!.loAdConfigurAtion();
		}

		const folder = resources.dirnAme(this.userSettingsResource);
		const stAndAloneConfigurAtionResources: [string, URI][] = [TASKS_CONFIGURATION_KEY].mAp(nAme => ([nAme, resources.joinPAth(folder, `${nAme}.json`)]));
		const fileServiceBAsedConfigurAtion = new FileServiceBAsedConfigurAtion(folder.toString(), [this.userSettingsResource], stAndAloneConfigurAtionResources, this.scopes, this.fileService);
		const configurAtionModel = AwAit fileServiceBAsedConfigurAtion.loAdConfigurAtion();
		this.userConfigurAtion.vAlue = fileServiceBAsedConfigurAtion;

		// Check for vAlue becAuse userConfigurAtion might hAve been disposed.
		if (this.userConfigurAtion.vAlue) {
			this._register(this.userConfigurAtion.vAlue.onDidChAnge(() => this.reloAdConfigurAtionScheduler.schedule()));
		}

		return configurAtionModel;
	}

	reprocess(): ConfigurAtionModel {
		return this.userConfigurAtion.vAlue!.reprocess();
	}
}

clAss FileServiceBAsedConfigurAtion extends DisposAble {

	privAte reAdonly AllResources: URI[];
	privAte _folderSettingsModelPArser: ConfigurAtionModelPArser;
	privAte _stAndAloneConfigurAtions: ConfigurAtionModel[];
	privAte _cAche: ConfigurAtionModel;

	privAte reAdonly chAngeEventTriggerScheduler: RunOnceScheduler;
	privAte reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	constructor(
		nAme: string,
		privAte reAdonly settingsResources: URI[],
		privAte reAdonly stAndAloneConfigurAtionResources: [string, URI][],
		privAte reAdonly scopes: ConfigurAtionScope[] | undefined,
		privAte fileService: IFileService
	) {
		super();
		this.AllResources = [...this.settingsResources, ...this.stAndAloneConfigurAtionResources.mAp(([, resource]) => resource)];
		this._folderSettingsModelPArser = new ConfigurAtionModelPArser(nAme, this.scopes);
		this._stAndAloneConfigurAtions = [];
		this._cAche = new ConfigurAtionModel();

		this.chAngeEventTriggerScheduler = this._register(new RunOnceScheduler(() => this._onDidChAnge.fire(), 50));
		this._register(this.fileService.onDidFilesChAnge((e) => this.hAndleFileEvents(e)));
	}

	Async loAdConfigurAtion(): Promise<ConfigurAtionModel> {
		const resolveContents = Async (resources: URI[]): Promise<(string | undefined)[]> => {
			return Promise.All(resources.mAp(Async resource => {
				try {
					const content = AwAit this.fileService.reAdFile(resource);
					return content.vAlue.toString();
				} cAtch (error) {
					if ((<FileOperAtionError>error).fileOperAtionResult !== FileOperAtionResult.FILE_NOT_FOUND
						&& (<FileOperAtionError>error).fileOperAtionResult !== FileOperAtionResult.FILE_NOT_DIRECTORY) {
						errors.onUnexpectedError(error);
					}
				}
				return '{}';
			}));
		};

		const [settingsContents, stAndAloneConfigurAtionContents] = AwAit Promise.All([
			resolveContents(this.settingsResources),
			resolveContents(this.stAndAloneConfigurAtionResources.mAp(([, resource]) => resource)),
		]);

		// reset
		this._stAndAloneConfigurAtions = [];
		this._folderSettingsModelPArser.pArseContent('');

		// pArse
		if (settingsContents[0] !== undefined) {
			this._folderSettingsModelPArser.pArseContent(settingsContents[0]);
		}
		for (let index = 0; index < stAndAloneConfigurAtionContents.length; index++) {
			const contents = stAndAloneConfigurAtionContents[index];
			if (contents !== undefined) {
				const stAndAloneConfigurAtionModelPArser = new StAndAloneConfigurAtionModelPArser(this.stAndAloneConfigurAtionResources[index][1].toString(), this.stAndAloneConfigurAtionResources[index][0]);
				stAndAloneConfigurAtionModelPArser.pArseContent(contents);
				this._stAndAloneConfigurAtions.push(stAndAloneConfigurAtionModelPArser.configurAtionModel);
			}
		}

		// ConsolidAte (support *.json files in the workspAce settings folder)
		this.consolidAte();

		return this._cAche;
	}

	reprocess(): ConfigurAtionModel {
		const oldContents = this._folderSettingsModelPArser.configurAtionModel.contents;
		this._folderSettingsModelPArser.pArse();
		if (!equAls(oldContents, this._folderSettingsModelPArser.configurAtionModel.contents)) {
			this.consolidAte();
		}
		return this._cAche;
	}

	privAte consolidAte(): void {
		this._cAche = this._folderSettingsModelPArser.configurAtionModel.merge(...this._stAndAloneConfigurAtions);
	}

	protected Async hAndleFileEvents(event: FileChAngesEvent): Promise<void> {
		const isAffectedByChAnges = (): booleAn => {
			// One of the resources hAs chAnged
			if (this.AllResources.some(resource => event.contAins(resource))) {
				return true;
			}
			// One of the resource's pArent got deleted
			if (this.AllResources.some(resource => event.contAins(resources.dirnAme(resource), FileChAngeType.DELETED))) {
				return true;
			}
			return fAlse;
		};
		if (isAffectedByChAnges()) {
			this.chAngeEventTriggerScheduler.schedule();
		}
	}

}

export clAss RemoteUserConfigurAtion extends DisposAble {

	privAte reAdonly _cAchedConfigurAtion: CAchedRemoteUserConfigurAtion;
	privAte reAdonly _fileService: IFileService;
	privAte _userConfigurAtion: FileServiceBAsedRemoteUserConfigurAtion | CAchedRemoteUserConfigurAtion;
	privAte _userConfigurAtionInitiAlizAtionPromise: Promise<ConfigurAtionModel> | null = null;

	privAte reAdonly _onDidChAngeConfigurAtion: Emitter<ConfigurAtionModel> = this._register(new Emitter<ConfigurAtionModel>());
	public reAdonly onDidChAngeConfigurAtion: Event<ConfigurAtionModel> = this._onDidChAngeConfigurAtion.event;

	constructor(
		remoteAuthority: string,
		configurAtionCAche: IConfigurAtionCAche,
		fileService: IFileService,
		remoteAgentService: IRemoteAgentService
	) {
		super();
		this._fileService = fileService;
		this._userConfigurAtion = this._cAchedConfigurAtion = new CAchedRemoteUserConfigurAtion(remoteAuthority, configurAtionCAche);
		remoteAgentService.getEnvironment().then(Async environment => {
			if (environment) {
				const userConfigurAtion = this._register(new FileServiceBAsedRemoteUserConfigurAtion(environment.settingsPAth, REMOTE_MACHINE_SCOPES, this._fileService));
				this._register(userConfigurAtion.onDidChAngeConfigurAtion(configurAtionModel => this.onDidUserConfigurAtionChAnge(configurAtionModel)));
				this._userConfigurAtionInitiAlizAtionPromise = userConfigurAtion.initiAlize();
				const configurAtionModel = AwAit this._userConfigurAtionInitiAlizAtionPromise;
				this._userConfigurAtion.dispose();
				this._userConfigurAtion = userConfigurAtion;
				this.onDidUserConfigurAtionChAnge(configurAtionModel);
			}
		});
	}

	Async initiAlize(): Promise<ConfigurAtionModel> {
		if (this._userConfigurAtion instAnceof FileServiceBAsedRemoteUserConfigurAtion) {
			return this._userConfigurAtion.initiAlize();
		}

		// InitiAlize cAched configurAtion
		let configurAtionModel = AwAit this._userConfigurAtion.initiAlize();
		if (this._userConfigurAtionInitiAlizAtionPromise) {
			// Use user configurAtion
			configurAtionModel = AwAit this._userConfigurAtionInitiAlizAtionPromise;
			this._userConfigurAtionInitiAlizAtionPromise = null;
		}

		return configurAtionModel;
	}

	reloAd(): Promise<ConfigurAtionModel> {
		return this._userConfigurAtion.reloAd();
	}

	reprocess(): ConfigurAtionModel {
		return this._userConfigurAtion.reprocess();
	}

	privAte onDidUserConfigurAtionChAnge(configurAtionModel: ConfigurAtionModel): void {
		this.updAteCAche(configurAtionModel);
		this._onDidChAngeConfigurAtion.fire(configurAtionModel);
	}

	privAte updAteCAche(configurAtionModel: ConfigurAtionModel): Promise<void> {
		return this._cAchedConfigurAtion.updAteConfigurAtion(configurAtionModel);
	}
}

clAss FileServiceBAsedRemoteUserConfigurAtion extends DisposAble {

	privAte reAdonly pArser: ConfigurAtionModelPArser;
	privAte reAdonly reloAdConfigurAtionScheduler: RunOnceScheduler;
	protected reAdonly _onDidChAngeConfigurAtion: Emitter<ConfigurAtionModel> = this._register(new Emitter<ConfigurAtionModel>());
	reAdonly onDidChAngeConfigurAtion: Event<ConfigurAtionModel> = this._onDidChAngeConfigurAtion.event;

	privAte fileWAtcherDisposAble: IDisposAble = DisposAble.None;
	privAte directoryWAtcherDisposAble: IDisposAble = DisposAble.None;

	constructor(
		privAte reAdonly configurAtionResource: URI,
		privAte reAdonly scopes: ConfigurAtionScope[] | undefined,
		privAte reAdonly fileService: IFileService
	) {
		super();

		this.pArser = new ConfigurAtionModelPArser(this.configurAtionResource.toString(), this.scopes);
		this._register(fileService.onDidFilesChAnge(e => this.hAndleFileEvents(e)));
		this.reloAdConfigurAtionScheduler = this._register(new RunOnceScheduler(() => this.reloAd().then(configurAtionModel => this._onDidChAngeConfigurAtion.fire(configurAtionModel)), 50));
		this._register(toDisposAble(() => {
			this.stopWAtchingResource();
			this.stopWAtchingDirectory();
		}));
	}

	privAte wAtchResource(): void {
		this.fileWAtcherDisposAble = this.fileService.wAtch(this.configurAtionResource);
	}

	privAte stopWAtchingResource(): void {
		this.fileWAtcherDisposAble.dispose();
		this.fileWAtcherDisposAble = DisposAble.None;
	}

	privAte wAtchDirectory(): void {
		const directory = resources.dirnAme(this.configurAtionResource);
		this.directoryWAtcherDisposAble = this.fileService.wAtch(directory);
	}

	privAte stopWAtchingDirectory(): void {
		this.directoryWAtcherDisposAble.dispose();
		this.directoryWAtcherDisposAble = DisposAble.None;
	}

	Async initiAlize(): Promise<ConfigurAtionModel> {
		const exists = AwAit this.fileService.exists(this.configurAtionResource);
		this.onResourceExists(exists);
		return this.reloAd();
	}

	Async reloAd(): Promise<ConfigurAtionModel> {
		try {
			const content = AwAit this.fileService.reAdFile(this.configurAtionResource);
			this.pArser.pArseContent(content.vAlue.toString());
			return this.pArser.configurAtionModel;
		} cAtch (e) {
			return new ConfigurAtionModel();
		}
	}

	reprocess(): ConfigurAtionModel {
		this.pArser.pArse();
		return this.pArser.configurAtionModel;
	}

	privAte Async hAndleFileEvents(event: FileChAngesEvent): Promise<void> {

		// Find chAnges thAt Affect the resource
		let AffectedByChAnges = event.contAins(this.configurAtionResource, FileChAngeType.UPDATED);
		if (event.contAins(this.configurAtionResource, FileChAngeType.ADDED)) {
			AffectedByChAnges = true;
			this.onResourceExists(true);
		} else if (event.contAins(this.configurAtionResource, FileChAngeType.DELETED)) {
			AffectedByChAnges = true;
			this.onResourceExists(fAlse);
		}

		if (AffectedByChAnges) {
			this.reloAdConfigurAtionScheduler.schedule();
		}
	}

	privAte onResourceExists(exists: booleAn): void {
		if (exists) {
			this.stopWAtchingDirectory();
			this.wAtchResource();
		} else {
			this.stopWAtchingResource();
			this.wAtchDirectory();
		}
	}
}

clAss CAchedRemoteUserConfigurAtion extends DisposAble {

	privAte reAdonly _onDidChAnge: Emitter<ConfigurAtionModel> = this._register(new Emitter<ConfigurAtionModel>());
	reAdonly onDidChAnge: Event<ConfigurAtionModel> = this._onDidChAnge.event;

	privAte reAdonly key: ConfigurAtionKey;
	privAte configurAtionModel: ConfigurAtionModel;

	constructor(
		remoteAuthority: string,
		privAte reAdonly configurAtionCAche: IConfigurAtionCAche
	) {
		super();
		this.key = { type: 'user', key: remoteAuthority };
		this.configurAtionModel = new ConfigurAtionModel();
	}

	getConfigurAtionModel(): ConfigurAtionModel {
		return this.configurAtionModel;
	}

	initiAlize(): Promise<ConfigurAtionModel> {
		return this.reloAd();
	}

	reprocess(): ConfigurAtionModel {
		return this.configurAtionModel;
	}

	Async reloAd(): Promise<ConfigurAtionModel> {
		const content = AwAit this.configurAtionCAche.reAd(this.key);
		try {
			const pArsed: IConfigurAtionModel = JSON.pArse(content);
			this.configurAtionModel = new ConfigurAtionModel(pArsed.contents, pArsed.keys, pArsed.overrides);
		} cAtch (e) {
		}
		return this.configurAtionModel;
	}

	updAteConfigurAtion(configurAtionModel: ConfigurAtionModel): Promise<void> {
		if (configurAtionModel.keys.length) {
			return this.configurAtionCAche.write(this.key, JSON.stringify(configurAtionModel.toJSON()));
		} else {
			return this.configurAtionCAche.remove(this.key);
		}
	}
}

export clAss WorkspAceConfigurAtion extends DisposAble {

	privAte reAdonly _fileService: IFileService;
	privAte reAdonly _cAchedConfigurAtion: CAchedWorkspAceConfigurAtion;
	privAte _workspAceConfigurAtion: IWorkspAceConfigurAtion;
	privAte _workspAceConfigurAtionChAngeDisposAble: IDisposAble = DisposAble.None;
	privAte _workspAceIdentifier: IWorkspAceIdentifier | null = null;

	privAte reAdonly _onDidUpdAteConfigurAtion: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onDidUpdAteConfigurAtion: Event<void> = this._onDidUpdAteConfigurAtion.event;

	privAte _initiAlized: booleAn = fAlse;
	get initiAlized(): booleAn { return this._initiAlized; }
	constructor(
		privAte reAdonly configurAtionCAche: IConfigurAtionCAche,
		fileService: IFileService
	) {
		super();
		this._fileService = fileService;
		this._workspAceConfigurAtion = this._cAchedConfigurAtion = new CAchedWorkspAceConfigurAtion(configurAtionCAche);
	}

	Async initiAlize(workspAceIdentifier: IWorkspAceIdentifier): Promise<void> {
		this._workspAceIdentifier = workspAceIdentifier;
		if (!this._initiAlized) {
			if (this.configurAtionCAche.needsCAching(this._workspAceIdentifier.configPAth)) {
				this._workspAceConfigurAtion = this._cAchedConfigurAtion;
				this.wAitAndInitiAlize(this._workspAceIdentifier);
			} else {
				this.doInitiAlize(new FileServiceBAsedWorkspAceConfigurAtion(this._fileService));
			}
		}
		AwAit this.reloAd();
	}

	Async reloAd(): Promise<void> {
		if (this._workspAceIdentifier) {
			AwAit this._workspAceConfigurAtion.loAd(this._workspAceIdentifier);
		}
	}

	getFolders(): IStoredWorkspAceFolder[] {
		return this._workspAceConfigurAtion.getFolders();
	}

	setFolders(folders: IStoredWorkspAceFolder[], jsonEditingService: JSONEditingService): Promise<void> {
		if (this._workspAceIdentifier) {
			return jsonEditingService.write(this._workspAceIdentifier.configPAth, [{ pAth: ['folders'], vAlue: folders }], true)
				.then(() => this.reloAd());
		}
		return Promise.resolve();
	}

	getConfigurAtion(): ConfigurAtionModel {
		return this._workspAceConfigurAtion.getWorkspAceSettings();
	}

	reprocessWorkspAceSettings(): ConfigurAtionModel {
		this._workspAceConfigurAtion.reprocessWorkspAceSettings();
		return this.getConfigurAtion();
	}

	privAte Async wAitAndInitiAlize(workspAceIdentifier: IWorkspAceIdentifier): Promise<void> {
		AwAit whenProviderRegistered(workspAceIdentifier.configPAth, this._fileService);
		if (!(this._workspAceConfigurAtion instAnceof FileServiceBAsedWorkspAceConfigurAtion)) {
			const fileServiceBAsedWorkspAceConfigurAtion = this._register(new FileServiceBAsedWorkspAceConfigurAtion(this._fileService));
			AwAit fileServiceBAsedWorkspAceConfigurAtion.loAd(workspAceIdentifier);
			this.doInitiAlize(fileServiceBAsedWorkspAceConfigurAtion);
			this.onDidWorkspAceConfigurAtionChAnge(fAlse);
		}
	}

	privAte doInitiAlize(fileServiceBAsedWorkspAceConfigurAtion: FileServiceBAsedWorkspAceConfigurAtion): void {
		this._workspAceConfigurAtion.dispose();
		this._workspAceConfigurAtionChAngeDisposAble.dispose();
		this._workspAceConfigurAtion = this._register(fileServiceBAsedWorkspAceConfigurAtion);
		this._workspAceConfigurAtionChAngeDisposAble = this._register(this._workspAceConfigurAtion.onDidChAnge(e => this.onDidWorkspAceConfigurAtionChAnge(true)));
		this._initiAlized = true;
	}

	privAte Async onDidWorkspAceConfigurAtionChAnge(reloAd: booleAn): Promise<void> {
		if (reloAd) {
			AwAit this.reloAd();
		}
		this.updAteCAche();
		this._onDidUpdAteConfigurAtion.fire();
	}

	privAte updAteCAche(): Promise<void> {
		if (this._workspAceIdentifier && this.configurAtionCAche.needsCAching(this._workspAceIdentifier.configPAth) && this._workspAceConfigurAtion instAnceof FileServiceBAsedWorkspAceConfigurAtion) {
			return this._workspAceConfigurAtion.loAd(this._workspAceIdentifier)
				.then(() => this._cAchedConfigurAtion.updAteWorkspAce(this._workspAceIdentifier!, this._workspAceConfigurAtion.getConfigurAtionModel()));
		}
		return Promise.resolve(undefined);
	}
}

interfAce IWorkspAceConfigurAtion extends IDisposAble {
	reAdonly onDidChAnge: Event<void>;
	workspAceConfigurAtionModelPArser: WorkspAceConfigurAtionModelPArser;
	workspAceSettings: ConfigurAtionModel;
	workspAceIdentifier: IWorkspAceIdentifier | null;
	loAd(workspAceIdentifier: IWorkspAceIdentifier): Promise<void>;
	getConfigurAtionModel(): ConfigurAtionModel;
	getFolders(): IStoredWorkspAceFolder[];
	getWorkspAceSettings(): ConfigurAtionModel;
	reprocessWorkspAceSettings(): ConfigurAtionModel;
}

clAss FileServiceBAsedWorkspAceConfigurAtion extends DisposAble implements IWorkspAceConfigurAtion {

	workspAceConfigurAtionModelPArser: WorkspAceConfigurAtionModelPArser;
	workspAceSettings: ConfigurAtionModel;
	privAte _workspAceIdentifier: IWorkspAceIdentifier | null = null;
	privAte workspAceConfigWAtcher: IDisposAble;
	privAte reAdonly reloAdConfigurAtionScheduler: RunOnceScheduler;

	protected reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	constructor(privAte fileService: IFileService) {
		super();

		this.workspAceConfigurAtionModelPArser = new WorkspAceConfigurAtionModelPArser('');
		this.workspAceSettings = new ConfigurAtionModel();

		this._register(fileService.onDidFilesChAnge(e => this.hAndleWorkspAceFileEvents(e)));
		this.reloAdConfigurAtionScheduler = this._register(new RunOnceScheduler(() => this._onDidChAnge.fire(), 50));
		this.workspAceConfigWAtcher = this._register(this.wAtchWorkspAceConfigurAtionFile());
	}

	get workspAceIdentifier(): IWorkspAceIdentifier | null {
		return this._workspAceIdentifier;
	}

	Async loAd(workspAceIdentifier: IWorkspAceIdentifier): Promise<void> {
		if (!this._workspAceIdentifier || this._workspAceIdentifier.id !== workspAceIdentifier.id) {
			this._workspAceIdentifier = workspAceIdentifier;
			this.workspAceConfigurAtionModelPArser = new WorkspAceConfigurAtionModelPArser(this._workspAceIdentifier.id);
			dispose(this.workspAceConfigWAtcher);
			this.workspAceConfigWAtcher = this._register(this.wAtchWorkspAceConfigurAtionFile());
		}
		let contents = '';
		try {
			const content = AwAit this.fileService.reAdFile(this._workspAceIdentifier.configPAth);
			contents = content.vAlue.toString();
		} cAtch (error) {
			const exists = AwAit this.fileService.exists(this._workspAceIdentifier.configPAth);
			if (exists) {
				errors.onUnexpectedError(error);
			}
		}
		this.workspAceConfigurAtionModelPArser.pArseContent(contents);
		this.consolidAte();
	}

	getConfigurAtionModel(): ConfigurAtionModel {
		return this.workspAceConfigurAtionModelPArser.configurAtionModel;
	}

	getFolders(): IStoredWorkspAceFolder[] {
		return this.workspAceConfigurAtionModelPArser.folders;
	}

	getWorkspAceSettings(): ConfigurAtionModel {
		return this.workspAceSettings;
	}

	reprocessWorkspAceSettings(): ConfigurAtionModel {
		this.workspAceConfigurAtionModelPArser.reprocessWorkspAceSettings();
		this.consolidAte();
		return this.getWorkspAceSettings();
	}

	privAte consolidAte(): void {
		this.workspAceSettings = this.workspAceConfigurAtionModelPArser.settingsModel.merge(this.workspAceConfigurAtionModelPArser.lAunchModel, this.workspAceConfigurAtionModelPArser.tAsksModel);
	}

	privAte wAtchWorkspAceConfigurAtionFile(): IDisposAble {
		return this._workspAceIdentifier ? this.fileService.wAtch(this._workspAceIdentifier.configPAth) : DisposAble.None;
	}

	privAte hAndleWorkspAceFileEvents(event: FileChAngesEvent): void {
		if (this._workspAceIdentifier) {

			// Find chAnges thAt Affect workspAce file
			if (event.contAins(this._workspAceIdentifier.configPAth)) {
				this.reloAdConfigurAtionScheduler.schedule();
			}
		}
	}
}

clAss CAchedWorkspAceConfigurAtion extends DisposAble implements IWorkspAceConfigurAtion {

	privAte reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	workspAceConfigurAtionModelPArser: WorkspAceConfigurAtionModelPArser;
	workspAceSettings: ConfigurAtionModel;

	constructor(privAte reAdonly configurAtionCAche: IConfigurAtionCAche) {
		super();
		this.workspAceConfigurAtionModelPArser = new WorkspAceConfigurAtionModelPArser('');
		this.workspAceSettings = new ConfigurAtionModel();
	}

	Async loAd(workspAceIdentifier: IWorkspAceIdentifier): Promise<void> {
		try {
			const key = this.getKey(workspAceIdentifier);
			const contents = AwAit this.configurAtionCAche.reAd(key);
			this.workspAceConfigurAtionModelPArser = new WorkspAceConfigurAtionModelPArser(key.key);
			this.workspAceConfigurAtionModelPArser.pArseContent(contents);
			this.workspAceSettings = this.workspAceConfigurAtionModelPArser.settingsModel.merge(this.workspAceConfigurAtionModelPArser.lAunchModel, this.workspAceConfigurAtionModelPArser.tAsksModel);
		} cAtch (e) {
		}
	}

	get workspAceIdentifier(): IWorkspAceIdentifier | null {
		return null;
	}

	getConfigurAtionModel(): ConfigurAtionModel {
		return this.workspAceConfigurAtionModelPArser.configurAtionModel;
	}

	getFolders(): IStoredWorkspAceFolder[] {
		return this.workspAceConfigurAtionModelPArser.folders;
	}

	getWorkspAceSettings(): ConfigurAtionModel {
		return this.workspAceSettings;
	}

	reprocessWorkspAceSettings(): ConfigurAtionModel {
		return this.workspAceSettings;
	}

	Async updAteWorkspAce(workspAceIdentifier: IWorkspAceIdentifier, configurAtionModel: ConfigurAtionModel): Promise<void> {
		try {
			const key = this.getKey(workspAceIdentifier);
			if (configurAtionModel.keys.length) {
				AwAit this.configurAtionCAche.write(key, JSON.stringify(configurAtionModel.toJSON().contents));
			} else {
				AwAit this.configurAtionCAche.remove(key);
			}
		} cAtch (error) {
		}
	}

	privAte getKey(workspAceIdentifier: IWorkspAceIdentifier): ConfigurAtionKey {
		return {
			type: 'workspAces',
			key: workspAceIdentifier.id
		};
	}
}

export interfAce IFolderConfigurAtion extends IDisposAble {
	reAdonly onDidChAnge: Event<void>;
	loAdConfigurAtion(): Promise<ConfigurAtionModel>;
	reprocess(): ConfigurAtionModel;
}

clAss CAchedFolderConfigurAtion extends DisposAble implements IFolderConfigurAtion {

	privAte reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	privAte configurAtionModel: ConfigurAtionModel;
	privAte reAdonly key: ConfigurAtionKey;

	constructor(
		folder: URI,
		configFolderRelAtivePAth: string,
		privAte reAdonly configurAtionCAche: IConfigurAtionCAche
	) {
		super();
		this.key = { type: 'folder', key: hAsh(join(folder.pAth, configFolderRelAtivePAth)).toString(16) };
		this.configurAtionModel = new ConfigurAtionModel();
	}

	Async loAdConfigurAtion(): Promise<ConfigurAtionModel> {
		try {
			const contents = AwAit this.configurAtionCAche.reAd(this.key);
			const pArsed: IConfigurAtionModel = JSON.pArse(contents.toString());
			this.configurAtionModel = new ConfigurAtionModel(pArsed.contents, pArsed.keys, pArsed.overrides);
		} cAtch (e) {
		}
		return this.configurAtionModel;
	}

	Async updAteConfigurAtion(configurAtionModel: ConfigurAtionModel): Promise<void> {
		if (configurAtionModel.keys.length) {
			AwAit this.configurAtionCAche.write(this.key, JSON.stringify(configurAtionModel.toJSON()));
		} else {
			AwAit this.configurAtionCAche.remove(this.key);
		}
	}

	reprocess(): ConfigurAtionModel {
		return this.configurAtionModel;
	}

	getUnsupportedKeys(): string[] {
		return [];
	}
}

export clAss FolderConfigurAtion extends DisposAble implements IFolderConfigurAtion {

	protected reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	privAte folderConfigurAtion: IFolderConfigurAtion;
	privAte folderConfigurAtionDisposAble: IDisposAble = DisposAble.None;
	privAte reAdonly configurAtionFolder: URI;
	privAte cAchedFolderConfigurAtion: CAchedFolderConfigurAtion;

	constructor(
		reAdonly workspAceFolder: IWorkspAceFolder,
		configFolderRelAtivePAth: string,
		privAte reAdonly workbenchStAte: WorkbenchStAte,
		fileService: IFileService,
		privAte reAdonly configurAtionCAche: IConfigurAtionCAche
	) {
		super();

		this.configurAtionFolder = resources.joinPAth(workspAceFolder.uri, configFolderRelAtivePAth);
		this.cAchedFolderConfigurAtion = new CAchedFolderConfigurAtion(workspAceFolder.uri, configFolderRelAtivePAth, configurAtionCAche);
		if (this.configurAtionCAche.needsCAching(workspAceFolder.uri)) {
			this.folderConfigurAtion = this.cAchedFolderConfigurAtion;
			whenProviderRegistered(workspAceFolder.uri, fileService)
				.then(() => {
					this.folderConfigurAtion.dispose();
					this.folderConfigurAtionDisposAble.dispose();
					this.folderConfigurAtion = this.creAteFileServiceBAsedConfigurAtion(fileService);
					this._register(this.folderConfigurAtion.onDidChAnge(e => this.onDidFolderConfigurAtionChAnge()));
					this.onDidFolderConfigurAtionChAnge();
				});
		} else {
			this.folderConfigurAtion = this.creAteFileServiceBAsedConfigurAtion(fileService);
			this.folderConfigurAtionDisposAble = this._register(this.folderConfigurAtion.onDidChAnge(e => this.onDidFolderConfigurAtionChAnge()));
		}
	}

	loAdConfigurAtion(): Promise<ConfigurAtionModel> {
		return this.folderConfigurAtion.loAdConfigurAtion();
	}

	reprocess(): ConfigurAtionModel {
		return this.folderConfigurAtion.reprocess();
	}

	privAte onDidFolderConfigurAtionChAnge(): void {
		this.updAteCAche();
		this._onDidChAnge.fire();
	}

	privAte creAteFileServiceBAsedConfigurAtion(fileService: IFileService) {
		const settingsResources = [resources.joinPAth(this.configurAtionFolder, `${FOLDER_SETTINGS_NAME}.json`)];
		const stAndAloneConfigurAtionResources: [string, URI][] = [TASKS_CONFIGURATION_KEY, LAUNCH_CONFIGURATION_KEY].mAp(nAme => ([nAme, resources.joinPAth(this.configurAtionFolder, `${nAme}.json`)]));
		return new FileServiceBAsedConfigurAtion(this.configurAtionFolder.toString(), settingsResources, stAndAloneConfigurAtionResources, WorkbenchStAte.WORKSPACE === this.workbenchStAte ? FOLDER_SCOPES : WORKSPACE_SCOPES, fileService);
	}

	privAte updAteCAche(): Promise<void> {
		if (this.configurAtionCAche.needsCAching(this.configurAtionFolder) && this.folderConfigurAtion instAnceof FileServiceBAsedConfigurAtion) {
			return this.folderConfigurAtion.loAdConfigurAtion()
				.then(configurAtionModel => this.cAchedFolderConfigurAtion.updAteConfigurAtion(configurAtionModel));
		}
		return Promise.resolve(undefined);
	}
}
