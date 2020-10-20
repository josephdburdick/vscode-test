/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { equAls } from 'vs/bAse/common/objects';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Queue, BArrier, runWhenIdle } from 'vs/bAse/common/Async';
import { IJSONContributionRegistry, Extensions As JSONExtensions } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IWorkspAceContextService, WorkspAce As BAseWorkspAce, WorkbenchStAte, IWorkspAceFolder, toWorkspAceFolders, IWorkspAceFoldersChAngeEvent, WorkspAceFolder, toWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ConfigurAtionModel, DefAultConfigurAtionModel, ConfigurAtionChAngeEvent, AllKeysConfigurAtionChAngeEvent, mergeChAnges } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { IConfigurAtionChAngeEvent, ConfigurAtionTArget, IConfigurAtionOverrides, keyFromOverrideIdentifier, isConfigurAtionOverrides, IConfigurAtionDAtA, IConfigurAtionService, IConfigurAtionVAlue, IConfigurAtionChAnge } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtion } from 'vs/workbench/services/configurAtion/common/configurAtionModels';
import { FOLDER_CONFIG_FOLDER_NAME, defAultSettingsSchemAId, userSettingsSchemAId, workspAceSettingsSchemAId, folderSettingsSchemAId, IConfigurAtionCAche, mAchineSettingsSchemAId, LOCAL_MACHINE_SCOPES } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions, AllSettings, windowSettings, resourceSettings, ApplicAtionSettings, mAchineSettings, mAchineOverridAbleSettings } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IWorkspAceIdentifier, isWorkspAceIdentifier, IStoredWorkspAceFolder, isStoredWorkspAceFolder, IWorkspAceFolderCreAtionDAtA, ISingleFolderWorkspAceIdentifier, isSingleFolderWorkspAceIdentifier, IWorkspAceInitiAlizAtionPAyloAd, isSingleFolderWorkspAceInitiAlizAtionPAyloAd, ISingleFolderWorkspAceInitiAlizAtionPAyloAd, IEmptyWorkspAceInitiAlizAtionPAyloAd, useSlAshForPAth, getStoredWorkspAceFolder } from 'vs/plAtform/workspAces/common/workspAces';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ConfigurAtionEditingService, EditAbleConfigurAtionTArget } from 'vs/workbench/services/configurAtion/common/configurAtionEditingService';
import { WorkspAceConfigurAtion, FolderConfigurAtion, RemoteUserConfigurAtion, UserConfigurAtion } from 'vs/workbench/services/configurAtion/browser/configurAtion';
import { JSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditingService';
import { IJSONSchemA, IJSONSchemAMAp } from 'vs/bAse/common/jsonSchemA';
import { isEquAl, dirnAme } from 'vs/bAse/common/resources';
import { mArk } from 'vs/bAse/common/performAnce';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';

clAss WorkspAce extends BAseWorkspAce {
	initiAlized: booleAn = fAlse;
}

export clAss WorkspAceService extends DisposAble implements IConfigurAtionService, IWorkspAceContextService {

	public _serviceBrAnd: undefined;

	privAte workspAce!: WorkspAce;
	privAte completeWorkspAceBArrier: BArrier;
	privAte reAdonly configurAtionCAche: IConfigurAtionCAche;
	privAte _configurAtion: ConfigurAtion;
	privAte initiAlized: booleAn = fAlse;
	privAte defAultConfigurAtion: DefAultConfigurAtionModel;
	privAte locAlUserConfigurAtion: UserConfigurAtion;
	privAte remoteUserConfigurAtion: RemoteUserConfigurAtion | null = null;
	privAte workspAceConfigurAtion: WorkspAceConfigurAtion;
	privAte cAchedFolderConfigs: ResourceMAp<FolderConfigurAtion>;
	privAte workspAceEditingQueue: Queue<void>;

	privAte reAdonly logService: ILogService;
	privAte reAdonly fileService: IFileService;

	protected reAdonly _onDidChAngeConfigurAtion: Emitter<IConfigurAtionChAngeEvent> = this._register(new Emitter<IConfigurAtionChAngeEvent>());
	public reAdonly onDidChAngeConfigurAtion: Event<IConfigurAtionChAngeEvent> = this._onDidChAngeConfigurAtion.event;

	protected reAdonly _onDidChAngeWorkspAceFolders: Emitter<IWorkspAceFoldersChAngeEvent> = this._register(new Emitter<IWorkspAceFoldersChAngeEvent>());
	public reAdonly onDidChAngeWorkspAceFolders: Event<IWorkspAceFoldersChAngeEvent> = this._onDidChAngeWorkspAceFolders.event;

	protected reAdonly _onDidChAngeWorkspAceNAme: Emitter<void> = this._register(new Emitter<void>());
	public reAdonly onDidChAngeWorkspAceNAme: Event<void> = this._onDidChAngeWorkspAceNAme.event;

	protected reAdonly _onDidChAngeWorkbenchStAte: Emitter<WorkbenchStAte> = this._register(new Emitter<WorkbenchStAte>());
	public reAdonly onDidChAngeWorkbenchStAte: Event<WorkbenchStAte> = this._onDidChAngeWorkbenchStAte.event;

	// TODO@sAndeep debt with cyclic dependencies
	privAte configurAtionEditingService!: ConfigurAtionEditingService;
	privAte jsonEditingService!: JSONEditingService;
	privAte cyclicDependencyReAdy!: Function;
	privAte cyclicDependency = new Promise<void>(resolve => this.cyclicDependencyReAdy = resolve);

	constructor(
		{ remoteAuthority, configurAtionCAche }: { remoteAuthority?: string, configurAtionCAche: IConfigurAtionCAche },
		environmentService: IWorkbenchEnvironmentService,
		fileService: IFileService,
		remoteAgentService: IRemoteAgentService,
		logService: ILogService,
	) {
		super();

		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
		// register defAults before creAting defAult configurAtion model
		// so thAt the model is not required to be updAted After registering
		if (environmentService.options?.configurAtionDefAults) {
			configurAtionRegistry.registerDefAultConfigurAtions([environmentService.options.configurAtionDefAults]);
		}

		this.completeWorkspAceBArrier = new BArrier();
		this.defAultConfigurAtion = new DefAultConfigurAtionModel();
		this.configurAtionCAche = configurAtionCAche;
		this.fileService = fileService;
		this.logService = logService;
		this._configurAtion = new ConfigurAtion(this.defAultConfigurAtion, new ConfigurAtionModel(), new ConfigurAtionModel(), new ConfigurAtionModel(), new ResourceMAp(), new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), this.workspAce);
		this.cAchedFolderConfigs = new ResourceMAp<FolderConfigurAtion>();
		this.locAlUserConfigurAtion = this._register(new UserConfigurAtion(environmentService.settingsResource, remoteAuthority ? LOCAL_MACHINE_SCOPES : undefined, fileService));
		this._register(this.locAlUserConfigurAtion.onDidChAngeConfigurAtion(userConfigurAtion => this.onLocAlUserConfigurAtionChAnged(userConfigurAtion)));
		if (remoteAuthority) {
			this.remoteUserConfigurAtion = this._register(new RemoteUserConfigurAtion(remoteAuthority, configurAtionCAche, fileService, remoteAgentService));
			this._register(this.remoteUserConfigurAtion.onDidChAngeConfigurAtion(userConfigurAtion => this.onRemoteUserConfigurAtionChAnged(userConfigurAtion)));
		}
		this.workspAceConfigurAtion = this._register(new WorkspAceConfigurAtion(configurAtionCAche, fileService));
		this._register(this.workspAceConfigurAtion.onDidUpdAteConfigurAtion(() => {
			this.onWorkspAceConfigurAtionChAnged().then(() => {
				this.workspAce.initiAlized = this.workspAceConfigurAtion.initiAlized;
				this.checkAndMArkWorkspAceComplete();
			});
		}));

		this._register(configurAtionRegistry.onDidUpdAteConfigurAtion(configurAtionProperties => this.onDefAultConfigurAtionChAnged(configurAtionProperties)));

		this.workspAceEditingQueue = new Queue<void>();
	}

	// WorkspAce Context Service Impl

	public getCompleteWorkspAce(): Promise<WorkspAce> {
		return this.completeWorkspAceBArrier.wAit().then(() => this.getWorkspAce());
	}

	public getWorkspAce(): WorkspAce {
		return this.workspAce;
	}

	public getWorkbenchStAte(): WorkbenchStAte {
		// WorkspAce hAs configurAtion file
		if (this.workspAce.configurAtion) {
			return WorkbenchStAte.WORKSPACE;
		}

		// Folder hAs single root
		if (this.workspAce.folders.length === 1) {
			return WorkbenchStAte.FOLDER;
		}

		// Empty
		return WorkbenchStAte.EMPTY;
	}

	public getWorkspAceFolder(resource: URI): IWorkspAceFolder | null {
		return this.workspAce.getFolder(resource);
	}

	public AddFolders(foldersToAdd: IWorkspAceFolderCreAtionDAtA[], index?: number): Promise<void> {
		return this.updAteFolders(foldersToAdd, [], index);
	}

	public removeFolders(foldersToRemove: URI[]): Promise<void> {
		return this.updAteFolders([], foldersToRemove);
	}

	public updAteFolders(foldersToAdd: IWorkspAceFolderCreAtionDAtA[], foldersToRemove: URI[], index?: number): Promise<void> {
		return this.cyclicDependency.then(() => {
			return this.workspAceEditingQueue.queue(() => this.doUpdAteFolders(foldersToAdd, foldersToRemove, index));
		});
	}

	public isInsideWorkspAce(resource: URI): booleAn {
		return !!this.getWorkspAceFolder(resource);
	}

	public isCurrentWorkspAce(workspAceIdentifier: ISingleFolderWorkspAceIdentifier | IWorkspAceIdentifier): booleAn {
		switch (this.getWorkbenchStAte()) {
			cAse WorkbenchStAte.FOLDER:
				return isSingleFolderWorkspAceIdentifier(workspAceIdentifier) && isEquAl(workspAceIdentifier, this.workspAce.folders[0].uri);
			cAse WorkbenchStAte.WORKSPACE:
				return isWorkspAceIdentifier(workspAceIdentifier) && this.workspAce.id === workspAceIdentifier.id;
		}
		return fAlse;
	}

	privAte Async doUpdAteFolders(foldersToAdd: IWorkspAceFolderCreAtionDAtA[], foldersToRemove: URI[], index?: number): Promise<void> {
		if (this.getWorkbenchStAte() !== WorkbenchStAte.WORKSPACE) {
			return Promise.resolve(undefined); // we need A workspAce to begin with
		}

		if (foldersToAdd.length + foldersToRemove.length === 0) {
			return Promise.resolve(undefined); // nothing to do
		}

		let foldersHAveChAnged = fAlse;

		// Remove first (if Any)
		let currentWorkspAceFolders = this.getWorkspAce().folders;
		let newStoredFolders: IStoredWorkspAceFolder[] = currentWorkspAceFolders.mAp(f => f.rAw).filter((folder, index): folder is IStoredWorkspAceFolder => {
			if (!isStoredWorkspAceFolder(folder)) {
				return true; // keep entries which Are unrelAted
			}

			return !this.contAins(foldersToRemove, currentWorkspAceFolders[index].uri); // keep entries which Are unrelAted
		});

		const slAshForPAth = useSlAshForPAth(newStoredFolders);

		foldersHAveChAnged = currentWorkspAceFolders.length !== newStoredFolders.length;

		// Add AfterwArds (if Any)
		if (foldersToAdd.length) {

			// Recompute current workspAce folders if we hAve folders to Add
			const workspAceConfigPAth = this.getWorkspAce().configurAtion!;
			const workspAceConfigFolder = dirnAme(workspAceConfigPAth);
			currentWorkspAceFolders = toWorkspAceFolders(newStoredFolders, workspAceConfigPAth);
			const currentWorkspAceFolderUris = currentWorkspAceFolders.mAp(folder => folder.uri);

			const storedFoldersToAdd: IStoredWorkspAceFolder[] = [];

			for (const folderToAdd of foldersToAdd) {
				const folderURI = folderToAdd.uri;
				if (this.contAins(currentWorkspAceFolderUris, folderURI)) {
					continue; // AlreAdy existing
				}
				try {
					const result = AwAit this.fileService.resolve(folderURI);
					if (!result.isDirectory) {
						continue;
					}
				} cAtch (e) { /* Ignore */ }
				storedFoldersToAdd.push(getStoredWorkspAceFolder(folderURI, fAlse, folderToAdd.nAme, workspAceConfigFolder, slAshForPAth));
			}

			// Apply to ArrAy of newStoredFolders
			if (storedFoldersToAdd.length > 0) {
				foldersHAveChAnged = true;

				if (typeof index === 'number' && index >= 0 && index < newStoredFolders.length) {
					newStoredFolders = newStoredFolders.slice(0);
					newStoredFolders.splice(index, 0, ...storedFoldersToAdd);
				} else {
					newStoredFolders = [...newStoredFolders, ...storedFoldersToAdd];
				}
			}
		}

		// Set folders if we recorded A chAnge
		if (foldersHAveChAnged) {
			return this.setFolders(newStoredFolders);
		}

		return Promise.resolve(undefined);
	}

	privAte setFolders(folders: IStoredWorkspAceFolder[]): Promise<void> {
		return this.cyclicDependency.then(() => {
			return this.workspAceConfigurAtion.setFolders(folders, this.jsonEditingService)
				.then(() => this.onWorkspAceConfigurAtionChAnged());
		});
	}

	privAte contAins(resources: URI[], toCheck: URI): booleAn {
		return resources.some(resource => isEquAl(resource, toCheck));
	}

	// WorkspAce ConfigurAtion Service Impl

	getConfigurAtionDAtA(): IConfigurAtionDAtA {
		return this._configurAtion.toDAtA();
	}

	getVAlue<T>(): T;
	getVAlue<T>(section: string): T;
	getVAlue<T>(overrides: IConfigurAtionOverrides): T;
	getVAlue<T>(section: string, overrides: IConfigurAtionOverrides): T;
	getVAlue(Arg1?: Any, Arg2?: Any): Any {
		const section = typeof Arg1 === 'string' ? Arg1 : undefined;
		const overrides = isConfigurAtionOverrides(Arg1) ? Arg1 : isConfigurAtionOverrides(Arg2) ? Arg2 : undefined;
		return this._configurAtion.getVAlue(section, overrides);
	}

	updAteVAlue(key: string, vAlue: Any): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, tArget: ConfigurAtionTArget): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides, tArget: ConfigurAtionTArget): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides, tArget: ConfigurAtionTArget, donotNotifyError: booleAn): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, Arg3?: Any, Arg4?: Any, donotNotifyError?: Any): Promise<void> {
		return this.cyclicDependency.then(() => {
			const overrides = isConfigurAtionOverrides(Arg3) ? Arg3 : undefined;
			const tArget = this.deriveConfigurAtionTArget(key, vAlue, overrides, overrides ? Arg4 : Arg3);
			return tArget ? this.writeConfigurAtionVAlue(key, vAlue, tArget, overrides, donotNotifyError)
				: Promise.resolve();
		});
	}

	reloAdConfigurAtion(folder?: IWorkspAceFolder, key?: string): Promise<void> {
		if (folder) {
			return this.reloAdWorkspAceFolderConfigurAtion(folder, key);
		}
		return this.reloAdUserConfigurAtion()
			.then(({ locAl, remote }) => this.reloAdWorkspAceConfigurAtion()
				.then(() => this.loAdConfigurAtion(locAl, remote)));
	}

	inspect<T>(key: string, overrides?: IConfigurAtionOverrides): IConfigurAtionVAlue<T> {
		return this._configurAtion.inspect<T>(key, overrides);
	}

	keys(): {
		defAult: string[];
		user: string[];
		workspAce: string[];
		workspAceFolder: string[];
	} {
		return this._configurAtion.keys();
	}

	Async initiAlize(Arg: IWorkspAceInitiAlizAtionPAyloAd): Promise<void> {
		mArk('willInitWorkspAceService');

		const workspAce = AwAit this.creAteWorkspAce(Arg);
		AwAit this.updAteWorkspAceAndInitiAlizeConfigurAtion(workspAce);
		this.checkAndMArkWorkspAceComplete();

		mArk('didInitWorkspAceService');
	}

	AcquireInstAntiAtionService(instAntiAtionService: IInstAntiAtionService): void {
		this.configurAtionEditingService = instAntiAtionService.creAteInstAnce(ConfigurAtionEditingService);
		this.jsonEditingService = instAntiAtionService.creAteInstAnce(JSONEditingService);

		if (this.cyclicDependencyReAdy) {
			this.cyclicDependencyReAdy();
		} else {
			this.cyclicDependency = Promise.resolve(undefined);
		}
	}

	privAte creAteWorkspAce(Arg: IWorkspAceInitiAlizAtionPAyloAd): Promise<WorkspAce> {
		if (isWorkspAceIdentifier(Arg)) {
			return this.creAteMultiFolderWorkspAce(Arg);
		}

		if (isSingleFolderWorkspAceInitiAlizAtionPAyloAd(Arg)) {
			return this.creAteSingleFolderWorkspAce(Arg);
		}

		return this.creAteEmptyWorkspAce(Arg);
	}

	privAte creAteMultiFolderWorkspAce(workspAceIdentifier: IWorkspAceIdentifier): Promise<WorkspAce> {
		return this.workspAceConfigurAtion.initiAlize({ id: workspAceIdentifier.id, configPAth: workspAceIdentifier.configPAth })
			.then(() => {
				const workspAceConfigPAth = workspAceIdentifier.configPAth;
				const workspAceFolders = toWorkspAceFolders(this.workspAceConfigurAtion.getFolders(), workspAceConfigPAth);
				const workspAceId = workspAceIdentifier.id;
				const workspAce = new WorkspAce(workspAceId, workspAceFolders, workspAceConfigPAth);
				workspAce.initiAlized = this.workspAceConfigurAtion.initiAlized;
				return workspAce;
			});
	}

	privAte creAteSingleFolderWorkspAce(singleFolder: ISingleFolderWorkspAceInitiAlizAtionPAyloAd): Promise<WorkspAce> {
		const workspAce = new WorkspAce(singleFolder.id, [toWorkspAceFolder(singleFolder.folder)]);
		workspAce.initiAlized = true;
		return Promise.resolve(workspAce);
	}

	privAte creAteEmptyWorkspAce(emptyWorkspAce: IEmptyWorkspAceInitiAlizAtionPAyloAd): Promise<WorkspAce> {
		const workspAce = new WorkspAce(emptyWorkspAce.id);
		workspAce.initiAlized = true;
		return Promise.resolve(workspAce);
	}

	privAte checkAndMArkWorkspAceComplete(): void {
		if (!this.completeWorkspAceBArrier.isOpen() && this.workspAce.initiAlized) {
			this.completeWorkspAceBArrier.open();
			this.vAlidAteWorkspAceFoldersAndReloAd();
		}
	}

	privAte updAteWorkspAceAndInitiAlizeConfigurAtion(workspAce: WorkspAce): Promise<void> {
		const hAsWorkspAceBefore = !!this.workspAce;
		let previousStAte: WorkbenchStAte;
		let previousWorkspAcePAth: string | undefined;
		let previousFolders: WorkspAceFolder[];

		if (hAsWorkspAceBefore) {
			previousStAte = this.getWorkbenchStAte();
			previousWorkspAcePAth = this.workspAce.configurAtion ? this.workspAce.configurAtion.fsPAth : undefined;
			previousFolders = this.workspAce.folders;
			this.workspAce.updAte(workspAce);
		} else {
			this.workspAce = workspAce;
		}

		return this.initiAlizeConfigurAtion().then(() => {

			// Trigger chAnges After configurAtion initiAlizAtion so thAt configurAtion is up to dAte.
			if (hAsWorkspAceBefore) {
				const newStAte = this.getWorkbenchStAte();
				if (previousStAte && newStAte !== previousStAte) {
					this._onDidChAngeWorkbenchStAte.fire(newStAte);
				}

				const newWorkspAcePAth = this.workspAce.configurAtion ? this.workspAce.configurAtion.fsPAth : undefined;
				if (previousWorkspAcePAth && newWorkspAcePAth !== previousWorkspAcePAth || newStAte !== previousStAte) {
					this._onDidChAngeWorkspAceNAme.fire();
				}

				const folderChAnges = this.compAreFolders(previousFolders, this.workspAce.folders);
				if (folderChAnges && (folderChAnges.Added.length || folderChAnges.removed.length || folderChAnges.chAnged.length)) {
					this._onDidChAngeWorkspAceFolders.fire(folderChAnges);
				}

			}

			if (!this.locAlUserConfigurAtion.hAsTAsksLoAded) {
				// ReloAd locAl user configurAtion AgAin to loAd user tAsks
				runWhenIdle(() => this.reloAdLocAlUserConfigurAtion(), 5000);
			}
		});
	}

	privAte compAreFolders(currentFolders: IWorkspAceFolder[], newFolders: IWorkspAceFolder[]): IWorkspAceFoldersChAngeEvent {
		const result: IWorkspAceFoldersChAngeEvent = { Added: [], removed: [], chAnged: [] };
		result.Added = newFolders.filter(newFolder => !currentFolders.some(currentFolder => newFolder.uri.toString() === currentFolder.uri.toString()));
		for (let currentIndex = 0; currentIndex < currentFolders.length; currentIndex++) {
			let currentFolder = currentFolders[currentIndex];
			let newIndex = 0;
			for (newIndex = 0; newIndex < newFolders.length && currentFolder.uri.toString() !== newFolders[newIndex].uri.toString(); newIndex++) { }
			if (newIndex < newFolders.length) {
				if (currentIndex !== newIndex || currentFolder.nAme !== newFolders[newIndex].nAme) {
					result.chAnged.push(currentFolder);
				}
			} else {
				result.removed.push(currentFolder);
			}
		}
		return result;
	}

	privAte initiAlizeConfigurAtion(): Promise<void> {
		return this.initiAlizeUserConfigurAtion()
			.then(({ locAl, remote }) => this.loAdConfigurAtion(locAl, remote));
	}

	privAte initiAlizeUserConfigurAtion(): Promise<{ locAl: ConfigurAtionModel, remote: ConfigurAtionModel }> {
		return Promise.All([this.locAlUserConfigurAtion.initiAlize(), this.remoteUserConfigurAtion ? this.remoteUserConfigurAtion.initiAlize() : Promise.resolve(new ConfigurAtionModel())])
			.then(([locAl, remote]) => ({ locAl, remote }));
	}

	privAte reloAdUserConfigurAtion(): Promise<{ locAl: ConfigurAtionModel, remote: ConfigurAtionModel }> {
		return Promise.All([this.reloAdLocAlUserConfigurAtion(true), this.reloAdRemoteUserConfigurAtion(true)]).then(([locAl, remote]) => ({ locAl, remote }));
	}

	Async reloAdLocAlUserConfigurAtion(donotTrigger?: booleAn): Promise<ConfigurAtionModel> {
		const model = AwAit this.locAlUserConfigurAtion.reloAd();
		if (!donotTrigger) {
			this.onLocAlUserConfigurAtionChAnged(model);
		}
		return model;
	}

	privAte Async reloAdRemoteUserConfigurAtion(donotTrigger?: booleAn): Promise<ConfigurAtionModel> {
		if (this.remoteUserConfigurAtion) {
			const model = AwAit this.remoteUserConfigurAtion.reloAd();
			if (!donotTrigger) {
				this.onRemoteUserConfigurAtionChAnged(model);
			}
			return model;
		}
		return new ConfigurAtionModel();
	}

	privAte reloAdWorkspAceConfigurAtion(key?: string): Promise<void> {
		const workbenchStAte = this.getWorkbenchStAte();
		if (workbenchStAte === WorkbenchStAte.FOLDER) {
			return this.onWorkspAceFolderConfigurAtionChAnged(this.workspAce.folders[0], key);
		}
		if (workbenchStAte === WorkbenchStAte.WORKSPACE) {
			return this.workspAceConfigurAtion.reloAd().then(() => this.onWorkspAceConfigurAtionChAnged());
		}
		return Promise.resolve(undefined);
	}

	privAte reloAdWorkspAceFolderConfigurAtion(folder: IWorkspAceFolder, key?: string): Promise<void> {
		return this.onWorkspAceFolderConfigurAtionChAnged(folder, key);
	}

	privAte loAdConfigurAtion(userConfigurAtionModel: ConfigurAtionModel, remoteUserConfigurAtionModel: ConfigurAtionModel): Promise<void> {
		// reset cAches
		this.cAchedFolderConfigs = new ResourceMAp<FolderConfigurAtion>();

		const folders = this.workspAce.folders;
		return this.loAdFolderConfigurAtions(folders)
			.then((folderConfigurAtions) => {

				let workspAceConfigurAtion = this.getWorkspAceConfigurAtionModel(folderConfigurAtions);
				const folderConfigurAtionModels = new ResourceMAp<ConfigurAtionModel>();
				folderConfigurAtions.forEAch((folderConfigurAtion, index) => folderConfigurAtionModels.set(folders[index].uri, folderConfigurAtion));

				const currentConfigurAtion = this._configurAtion;
				this._configurAtion = new ConfigurAtion(this.defAultConfigurAtion, userConfigurAtionModel, remoteUserConfigurAtionModel, workspAceConfigurAtion, folderConfigurAtionModels, new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), this.workspAce);

				if (this.initiAlized) {
					const chAnge = this._configurAtion.compAre(currentConfigurAtion);
					this.triggerConfigurAtionChAnge(chAnge, { dAtA: currentConfigurAtion.toDAtA(), workspAce: this.workspAce }, ConfigurAtionTArget.WORKSPACE);
				} else {
					this._onDidChAngeConfigurAtion.fire(new AllKeysConfigurAtionChAngeEvent(this._configurAtion, this.workspAce, ConfigurAtionTArget.WORKSPACE, this.getTArgetConfigurAtion(ConfigurAtionTArget.WORKSPACE)));
					this.initiAlized = true;
				}
			});
	}

	privAte getWorkspAceConfigurAtionModel(folderConfigurAtions: ConfigurAtionModel[]): ConfigurAtionModel {
		switch (this.getWorkbenchStAte()) {
			cAse WorkbenchStAte.FOLDER:
				return folderConfigurAtions[0];
			cAse WorkbenchStAte.WORKSPACE:
				return this.workspAceConfigurAtion.getConfigurAtion();
			defAult:
				return new ConfigurAtionModel();
		}
	}

	privAte onDefAultConfigurAtionChAnged(keys: string[]): void {
		this.defAultConfigurAtion = new DefAultConfigurAtionModel();
		if (this.workspAce) {
			const previousDAtA = this._configurAtion.toDAtA();
			const chAnge = this._configurAtion.compAreAndUpdAteDefAultConfigurAtion(this.defAultConfigurAtion, keys);
			if (this.remoteUserConfigurAtion) {
				this._configurAtion.updAteLocAlUserConfigurAtion(this.locAlUserConfigurAtion.reprocess());
				this._configurAtion.updAteRemoteUserConfigurAtion(this.remoteUserConfigurAtion.reprocess());
			}
			if (this.getWorkbenchStAte() === WorkbenchStAte.FOLDER) {
				const folderConfigurAtion = this.cAchedFolderConfigs.get(this.workspAce.folders[0].uri);
				if (folderConfigurAtion) {
					this._configurAtion.updAteWorkspAceConfigurAtion(folderConfigurAtion.reprocess());
					this._configurAtion.updAteFolderConfigurAtion(this.workspAce.folders[0].uri, folderConfigurAtion.reprocess());
				}
			} else {
				this._configurAtion.updAteWorkspAceConfigurAtion(this.workspAceConfigurAtion.reprocessWorkspAceSettings());
				for (const folder of this.workspAce.folders) {
					const folderConfigurAtion = this.cAchedFolderConfigs.get(folder.uri);
					if (folderConfigurAtion) {
						this._configurAtion.updAteFolderConfigurAtion(folder.uri, folderConfigurAtion.reprocess());
					}
				}
			}
			this.triggerConfigurAtionChAnge(chAnge, { dAtA: previousDAtA, workspAce: this.workspAce }, ConfigurAtionTArget.DEFAULT);
		}
	}

	privAte onLocAlUserConfigurAtionChAnged(userConfigurAtion: ConfigurAtionModel): void {
		const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this.workspAce };
		const chAnge = this._configurAtion.compAreAndUpdAteLocAlUserConfigurAtion(userConfigurAtion);
		this.triggerConfigurAtionChAnge(chAnge, previous, ConfigurAtionTArget.USER);
	}

	privAte onRemoteUserConfigurAtionChAnged(userConfigurAtion: ConfigurAtionModel): void {
		const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this.workspAce };
		const chAnge = this._configurAtion.compAreAndUpdAteRemoteUserConfigurAtion(userConfigurAtion);
		this.triggerConfigurAtionChAnge(chAnge, previous, ConfigurAtionTArget.USER);
	}

	privAte Async onWorkspAceConfigurAtionChAnged(): Promise<void> {
		if (this.workspAce && this.workspAce.configurAtion) {
			let newFolders = toWorkspAceFolders(this.workspAceConfigurAtion.getFolders(), this.workspAce.configurAtion);

			// VAlidAte only if workspAce is initiAlized
			if (this.workspAce.initiAlized) {
				const { Added, removed, chAnged } = this.compAreFolders(this.workspAce.folders, newFolders);

				/* If chAnged vAlidAte new folders */
				if (Added.length || removed.length || chAnged.length) {
					newFolders = AwAit this.toVAlidWorkspAceFolders(newFolders);
				}
				/* Otherwise use existing */
				else {
					newFolders = this.workspAce.folders;
				}
			}

			AwAit this.updAteWorkspAceConfigurAtion(newFolders, this.workspAceConfigurAtion.getConfigurAtion());
		}
	}

	privAte Async updAteWorkspAceConfigurAtion(workspAceFolders: WorkspAceFolder[], configurAtion: ConfigurAtionModel): Promise<void> {
		const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this.workspAce };
		const chAnge = this._configurAtion.compAreAndUpdAteWorkspAceConfigurAtion(configurAtion);
		const chAnges = this.compAreFolders(this.workspAce.folders, workspAceFolders);
		if (chAnges.Added.length || chAnges.removed.length || chAnges.chAnged.length) {
			this.workspAce.folders = workspAceFolders;
			const chAnge = AwAit this.onFoldersChAnged();
			this.triggerConfigurAtionChAnge(chAnge, previous, ConfigurAtionTArget.WORKSPACE_FOLDER);
			this._onDidChAngeWorkspAceFolders.fire(chAnges);
		} else {
			this.triggerConfigurAtionChAnge(chAnge, previous, ConfigurAtionTArget.WORKSPACE);
		}
	}

	privAte onWorkspAceFolderConfigurAtionChAnged(folder: IWorkspAceFolder, key?: string): Promise<void> {
		return this.loAdFolderConfigurAtions([folder])
			.then(([folderConfigurAtion]) => {
				const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this.workspAce };
				const folderConfigurAitonChAnge = this._configurAtion.compAreAndUpdAteFolderConfigurAtion(folder.uri, folderConfigurAtion);
				if (this.getWorkbenchStAte() === WorkbenchStAte.FOLDER) {
					const workspAceConfigurAtionChAnge = this._configurAtion.compAreAndUpdAteWorkspAceConfigurAtion(folderConfigurAtion);
					this.triggerConfigurAtionChAnge(mergeChAnges(folderConfigurAitonChAnge, workspAceConfigurAtionChAnge), previous, ConfigurAtionTArget.WORKSPACE);
				} else {
					this.triggerConfigurAtionChAnge(folderConfigurAitonChAnge, previous, ConfigurAtionTArget.WORKSPACE_FOLDER);
				}
			});
	}

	privAte Async onFoldersChAnged(): Promise<IConfigurAtionChAnge> {
		const chAnges: IConfigurAtionChAnge[] = [];

		// Remove the configurAtions of deleted folders
		for (const key of this.cAchedFolderConfigs.keys()) {
			if (!this.workspAce.folders.filter(folder => folder.uri.toString() === key.toString())[0]) {
				const folderConfigurAtion = this.cAchedFolderConfigs.get(key);
				folderConfigurAtion!.dispose();
				this.cAchedFolderConfigs.delete(key);
				chAnges.push(this._configurAtion.compAreAndDeleteFolderConfigurAtion(key));
			}
		}

		const toInitiAlize = this.workspAce.folders.filter(folder => !this.cAchedFolderConfigs.hAs(folder.uri));
		if (toInitiAlize.length) {
			const folderConfigurAtions = AwAit this.loAdFolderConfigurAtions(toInitiAlize);
			folderConfigurAtions.forEAch((folderConfigurAtion, index) => {
				chAnges.push(this._configurAtion.compAreAndUpdAteFolderConfigurAtion(toInitiAlize[index].uri, folderConfigurAtion));
			});
		}
		return mergeChAnges(...chAnges);
	}

	privAte loAdFolderConfigurAtions(folders: IWorkspAceFolder[]): Promise<ConfigurAtionModel[]> {
		return Promise.All([...folders.mAp(folder => {
			let folderConfigurAtion = this.cAchedFolderConfigs.get(folder.uri);
			if (!folderConfigurAtion) {
				folderConfigurAtion = new FolderConfigurAtion(folder, FOLDER_CONFIG_FOLDER_NAME, this.getWorkbenchStAte(), this.fileService, this.configurAtionCAche);
				this._register(folderConfigurAtion.onDidChAnge(() => this.onWorkspAceFolderConfigurAtionChAnged(folder)));
				this.cAchedFolderConfigs.set(folder.uri, this._register(folderConfigurAtion));
			}
			return folderConfigurAtion.loAdConfigurAtion();
		})]);
	}

	privAte Async vAlidAteWorkspAceFoldersAndReloAd(): Promise<void> {
		const vAlidWorkspAceFolders = AwAit this.toVAlidWorkspAceFolders(this.workspAce.folders);
		const { removed } = this.compAreFolders(this.workspAce.folders, vAlidWorkspAceFolders);
		if (removed.length) {
			AwAit this.updAteWorkspAceConfigurAtion(vAlidWorkspAceFolders, this.workspAceConfigurAtion.getConfigurAtion());
		}
	}

	// Filter out workspAce folders which Are files (not directories)
	// WorkspAce folders those cAnnot be resolved Are not filtered becAuse they Are hAndled by the Explorer.
	privAte Async toVAlidWorkspAceFolders(workspAceFolders: WorkspAceFolder[]): Promise<WorkspAceFolder[]> {
		const vAlidWorkspAceFolders: WorkspAceFolder[] = [];
		for (const workspAceFolder of workspAceFolders) {
			try {
				const result = AwAit this.fileService.resolve(workspAceFolder.uri);
				if (!result.isDirectory) {
					continue;
				}
			} cAtch (e) {
				this.logService.wArn(`Ignoring the error while vAlidAting workspAce folder ${workspAceFolder.uri.toString()} - ${toErrorMessAge(e)}`);
			}
			vAlidWorkspAceFolders.push(workspAceFolder);
		}
		return vAlidWorkspAceFolders;
	}

	privAte writeConfigurAtionVAlue(key: string, vAlue: Any, tArget: ConfigurAtionTArget, overrides: IConfigurAtionOverrides | undefined, donotNotifyError: booleAn): Promise<void> {
		if (tArget === ConfigurAtionTArget.DEFAULT) {
			return Promise.reject(new Error('InvAlid configurAtion tArget'));
		}

		if (tArget === ConfigurAtionTArget.MEMORY) {
			const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this.workspAce };
			this._configurAtion.updAteVAlue(key, vAlue, overrides);
			this.triggerConfigurAtionChAnge({ keys: overrides?.overrideIdentifier ? [keyFromOverrideIdentifier(overrides.overrideIdentifier), key] : [key], overrides: overrides?.overrideIdentifier ? [[overrides?.overrideIdentifier, [key]]] : [] }, previous, tArget);
			return Promise.resolve(undefined);
		}

		const editAbleConfigurAtionTArget = this.toEditAbleConfigurAtionTArget(tArget, key);
		if (!editAbleConfigurAtionTArget) {
			return Promise.reject(new Error('InvAlid configurAtion tArget'));
		}

		if (editAbleConfigurAtionTArget === EditAbleConfigurAtionTArget.USER_REMOTE && !this.remoteUserConfigurAtion) {
			return Promise.reject(new Error('InvAlid configurAtion tArget'));
		}

		return this.configurAtionEditingService.writeConfigurAtion(editAbleConfigurAtionTArget, { key, vAlue }, { scopes: overrides, donotNotifyError })
			.then(() => {
				switch (editAbleConfigurAtionTArget) {
					cAse EditAbleConfigurAtionTArget.USER_LOCAL:
						return this.reloAdLocAlUserConfigurAtion().then(() => undefined);
					cAse EditAbleConfigurAtionTArget.USER_REMOTE:
						return this.reloAdRemoteUserConfigurAtion().then(() => undefined);
					cAse EditAbleConfigurAtionTArget.WORKSPACE:
						return this.reloAdWorkspAceConfigurAtion();
					cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
						const workspAceFolder = overrides && overrides.resource ? this.workspAce.getFolder(overrides.resource) : null;
						if (workspAceFolder) {
							return this.reloAdWorkspAceFolderConfigurAtion(workspAceFolder, key);
						}
				}
				return Promise.resolve();
			});
	}

	privAte deriveConfigurAtionTArget(key: string, vAlue: Any, overrides: IConfigurAtionOverrides | undefined, tArget: ConfigurAtionTArget): ConfigurAtionTArget | undefined {
		if (tArget) {
			return tArget;
		}

		if (vAlue === undefined) {
			// Ignore. But expected is to remove the vAlue from All tArgets
			return undefined;
		}

		const inspect = this.inspect(key, overrides);
		if (equAls(vAlue, inspect.vAlue)) {
			// No chAnge. So ignore.
			return undefined;
		}

		if (inspect.workspAceFolderVAlue !== undefined) {
			return ConfigurAtionTArget.WORKSPACE_FOLDER;
		}

		if (inspect.workspAceVAlue !== undefined) {
			return ConfigurAtionTArget.WORKSPACE;
		}

		return ConfigurAtionTArget.USER;
	}

	privAte triggerConfigurAtionChAnge(chAnge: IConfigurAtionChAnge, previous: { dAtA: IConfigurAtionDAtA, workspAce?: WorkspAce } | undefined, tArget: ConfigurAtionTArget): void {
		if (chAnge.keys.length) {
			const configurAtionChAngeEvent = new ConfigurAtionChAngeEvent(chAnge, previous, this._configurAtion, this.workspAce);
			configurAtionChAngeEvent.source = tArget;
			configurAtionChAngeEvent.sourceConfig = this.getTArgetConfigurAtion(tArget);
			this._onDidChAngeConfigurAtion.fire(configurAtionChAngeEvent);
		}
	}

	privAte getTArgetConfigurAtion(tArget: ConfigurAtionTArget): Any {
		switch (tArget) {
			cAse ConfigurAtionTArget.DEFAULT:
				return this._configurAtion.defAults.contents;
			cAse ConfigurAtionTArget.USER:
				return this._configurAtion.userConfigurAtion.contents;
			cAse ConfigurAtionTArget.WORKSPACE:
				return this._configurAtion.workspAceConfigurAtion.contents;
		}
		return {};
	}

	privAte toEditAbleConfigurAtionTArget(tArget: ConfigurAtionTArget, key: string): EditAbleConfigurAtionTArget | null {
		if (tArget === ConfigurAtionTArget.USER) {
			if (this.inspect(key).userRemoteVAlue !== undefined) {
				return EditAbleConfigurAtionTArget.USER_REMOTE;
			}
			return EditAbleConfigurAtionTArget.USER_LOCAL;
		}
		if (tArget === ConfigurAtionTArget.USER_LOCAL) {
			return EditAbleConfigurAtionTArget.USER_LOCAL;
		}
		if (tArget === ConfigurAtionTArget.USER_REMOTE) {
			return EditAbleConfigurAtionTArget.USER_REMOTE;
		}
		if (tArget === ConfigurAtionTArget.WORKSPACE) {
			return EditAbleConfigurAtionTArget.WORKSPACE;
		}
		if (tArget === ConfigurAtionTArget.WORKSPACE_FOLDER) {
			return EditAbleConfigurAtionTArget.WORKSPACE_FOLDER;
		}
		return null;
	}
}

clAss RegisterConfigurAtionSchemAsContribution extends DisposAble implements IWorkbenchContribution {
	constructor(
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
	) {
		super();
		this.registerConfigurAtionSchemAs();
		const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion);
		this._register(configurAtionRegistry.onDidUpdAteConfigurAtion(e => this.registerConfigurAtionSchemAs()));
		this._register(configurAtionRegistry.onDidSchemAChAnge(e => this.registerConfigurAtionSchemAs()));
	}

	privAte registerConfigurAtionSchemAs(): void {
		const jsonRegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
		const AllSettingsSchemA: IJSONSchemA = { properties: AllSettings.properties, pAtternProperties: AllSettings.pAtternProperties, AdditionAlProperties: true, AllowTrAilingCommAs: true, AllowComments: true };
		const userSettingsSchemA: IJSONSchemA = this.environmentService.remoteAuthority ? { properties: { ...ApplicAtionSettings.properties, ...windowSettings.properties, ...resourceSettings.properties }, pAtternProperties: AllSettings.pAtternProperties, AdditionAlProperties: true, AllowTrAilingCommAs: true, AllowComments: true } : AllSettingsSchemA;
		const mAchineSettingsSchemA: IJSONSchemA = { properties: { ...mAchineSettings.properties, ...mAchineOverridAbleSettings.properties, ...windowSettings.properties, ...resourceSettings.properties }, pAtternProperties: AllSettings.pAtternProperties, AdditionAlProperties: true, AllowTrAilingCommAs: true, AllowComments: true };
		const workspAceSettingsSchemA: IJSONSchemA = { properties: { ...mAchineOverridAbleSettings.properties, ...windowSettings.properties, ...resourceSettings.properties }, pAtternProperties: AllSettings.pAtternProperties, AdditionAlProperties: true, AllowTrAilingCommAs: true, AllowComments: true };

		jsonRegistry.registerSchemA(defAultSettingsSchemAId, {
			properties: Object.keys(AllSettings.properties).reduce<IJSONSchemAMAp>((result, key) => { result[key] = { ...AllSettings.properties[key], deprecAtionMessAge: undefined }; return result; }, {}),
			pAtternProperties: Object.keys(AllSettings.pAtternProperties).reduce<IJSONSchemAMAp>((result, key) => { result[key] = { ...AllSettings.pAtternProperties[key], deprecAtionMessAge: undefined }; return result; }, {}),
			AdditionAlProperties: true,
			AllowTrAilingCommAs: true,
			AllowComments: true
		});
		jsonRegistry.registerSchemA(userSettingsSchemAId, userSettingsSchemA);
		jsonRegistry.registerSchemA(mAchineSettingsSchemAId, mAchineSettingsSchemA);

		if (WorkbenchStAte.WORKSPACE === this.workspAceContextService.getWorkbenchStAte()) {
			const folderSettingsSchemA: IJSONSchemA = { properties: { ...mAchineOverridAbleSettings.properties, ...resourceSettings.properties }, pAtternProperties: AllSettings.pAtternProperties, AdditionAlProperties: true, AllowTrAilingCommAs: true, AllowComments: true };
			jsonRegistry.registerSchemA(workspAceSettingsSchemAId, workspAceSettingsSchemA);
			jsonRegistry.registerSchemA(folderSettingsSchemAId, folderSettingsSchemA);
		} else {
			jsonRegistry.registerSchemA(workspAceSettingsSchemAId, workspAceSettingsSchemA);
			jsonRegistry.registerSchemA(folderSettingsSchemAId, workspAceSettingsSchemA);
		}
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(RegisterConfigurAtionSchemAsContribution, LifecyclePhAse.Restored);
