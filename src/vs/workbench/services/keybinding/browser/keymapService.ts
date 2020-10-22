/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IKeymapService, IKeyBoardLayoutInfo, IKeyBoardMapping, IWindowsKeyBoardMapping, KeymapInfo, IRawMixedKeyBoardMapping, getKeyBoardLayoutId, IKeymapInfo } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { DispatchConfig } from 'vs/workBench/services/keyBinding/common/dispatchConfig';
import { IKeyBoardMapper, CachedKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { OS, OperatingSystem, isMacintosh, isWindows } from 'vs/Base/common/platform';
import { WindowsKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/windowsKeyBoardMapper';
import { MacLinuxFallBackKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/macLinuxFallBackKeyBoardMapper';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { IMacLinuxKeyBoardMapping, MacLinuxKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/macLinuxKeyBoardMapper';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { parse, getNodeType } from 'vs/Base/common/json';
import * as oBjects from 'vs/Base/common/oBjects';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as ConfigExtensions, IConfigurationRegistry, IConfigurationNode } from 'vs/platform/configuration/common/configurationRegistry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { INavigatorWithKeyBoard } from 'vs/workBench/services/keyBinding/Browser/navigatorKeyBoard';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IStorageService } from 'vs/platform/storage/common/storage';

export class BrowserKeyBoardMapperFactoryBase {
	// keyBoard mapper
	protected _initialized: Boolean;
	protected _keyBoardMapper: IKeyBoardMapper | null;
	private readonly _onDidChangeKeyBoardMapper = new Emitter<void>();
	puBlic readonly onDidChangeKeyBoardMapper: Event<void> = this._onDidChangeKeyBoardMapper.event;

	// keymap infos
	protected _keymapInfos: KeymapInfo[];
	protected _mru: KeymapInfo[];
	private _activeKeymapInfo: KeymapInfo | null;

	get activeKeymap(): KeymapInfo | null {
		return this._activeKeymapInfo;
	}

	get keymapInfos(): KeymapInfo[] {
		return this._keymapInfos;
	}

	get activeKeyBoardLayout(): IKeyBoardLayoutInfo | null {
		if (!this._initialized) {
			return null;
		}

		return this._activeKeymapInfo && this._activeKeymapInfo.layout;
	}

	get activeKeyMapping(): IKeyBoardMapping | null {
		if (!this._initialized) {
			return null;
		}

		return this._activeKeymapInfo && this._activeKeymapInfo.mapping;
	}

	get keyBoardLayouts(): IKeyBoardLayoutInfo[] {
		return this._keymapInfos.map(keymapInfo => keymapInfo.layout);
	}

	protected constructor(
		// private _notificationService: INotificationService,
		// private _storageService: IStorageService,
		// private _commandService: ICommandService
	) {
		this._keyBoardMapper = null;
		this._initialized = false;
		this._keymapInfos = [];
		this._mru = [];
		this._activeKeymapInfo = null;

		if ((<INavigatorWithKeyBoard>navigator).keyBoard && (<INavigatorWithKeyBoard>navigator).keyBoard.addEventListener) {
			(<INavigatorWithKeyBoard>navigator).keyBoard.addEventListener!('layoutchange', () => {
				// Update user keyBoard map settings
				this._getBrowserKeyMapping().then((mapping: IKeyBoardMapping | null) => {
					if (this.isKeyMappingActive(mapping)) {
						return;
					}

					this.onKeyBoardLayoutChanged();
				});
			});
		}
	}

	registerKeyBoardLayout(layout: KeymapInfo) {
		this._keymapInfos.push(layout);
		this._mru = this._keymapInfos;
	}

	removeKeyBoardLayout(layout: KeymapInfo): void {
		let index = this._mru.indexOf(layout);
		this._mru.splice(index, 1);
		index = this._keymapInfos.indexOf(layout);
		this._keymapInfos.splice(index, 1);
	}

	getMatchedKeymapInfo(keyMapping: IKeyBoardMapping | null): { result: KeymapInfo, score: numBer } | null {
		if (!keyMapping) {
			return null;
		}

		let usStandard = this.getUSStandardLayout();

		if (usStandard) {
			let maxScore = usStandard.getScore(keyMapping);
			if (maxScore === 0) {
				return {
					result: usStandard,
					score: 0
				};
			}

			let result = usStandard;
			for (let i = 0; i < this._mru.length; i++) {
				let score = this._mru[i].getScore(keyMapping);
				if (score > maxScore) {
					if (score === 0) {
						return {
							result: this._mru[i],
							score: 0
						};
					}

					maxScore = score;
					result = this._mru[i];
				}
			}

			return {
				result,
				score: maxScore
			};
		}

		for (let i = 0; i < this._mru.length; i++) {
			if (this._mru[i].fuzzyEqual(keyMapping)) {
				return {
					result: this._mru[i],
					score: 0
				};
			}
		}

		return null;
	}

	getUSStandardLayout() {
		const usStandardLayouts = this._mru.filter(layout => layout.layout.isUSStandard);

		if (usStandardLayouts.length) {
			return usStandardLayouts[0];
		}

		return null;
	}

	isKeyMappingActive(keymap: IKeyBoardMapping | null) {
		return this._activeKeymapInfo && keymap && this._activeKeymapInfo.fuzzyEqual(keymap);
	}

	setUSKeyBoardLayout() {
		this._activeKeymapInfo = this.getUSStandardLayout();
	}

	setActiveKeyMapping(keymap: IKeyBoardMapping | null) {
		let keymapUpdated = false;
		let matchedKeyBoardLayout = this.getMatchedKeymapInfo(keymap);
		if (matchedKeyBoardLayout) {
			// let score = matchedKeyBoardLayout.score;

			// Due to https://Bugs.chromium.org/p/chromium/issues/detail?id=977609, any key after a dead key will generate a wrong mapping,
			// we shoud avoid yielding the false error.
			// if (keymap && score < 0) {
			// const donotAskUpdateKey = 'missing.keyBoardlayout.donotask';
			// if (this._storageService.getBoolean(donotAskUpdateKey, StorageScope.GLOBAL)) {
			// 	return;
			// }

			// // the keyBoard layout doesn't actually match the key event or the keymap from chromium
			// this._notificationService.prompt(
			// 	Severity.Info,
			// 	nls.localize('missing.keyBoardlayout', 'Fail to find matching keyBoard layout'),
			// 	[{
			// 		laBel: nls.localize('keyBoardLayoutMissing.configure', "Configure"),
			// 		run: () => this._commandService.executeCommand('workBench.action.openKeyBoardLayoutPicker')
			// 	}, {
			// 		laBel: nls.localize('neverAgain', "Don't Show Again"),
			// 		isSecondary: true,
			// 		run: () => this._storageService.store(donotAskUpdateKey, true, StorageScope.GLOBAL)
			// 	}]
			// );

			// console.warn('Active keymap/keyevent does not match current keyBoard layout', JSON.stringify(keymap), this._activeKeymapInfo ? JSON.stringify(this._activeKeymapInfo.layout) : '');

			// return;
			// }

			if (!this._activeKeymapInfo) {
				this._activeKeymapInfo = matchedKeyBoardLayout.result;
				keymapUpdated = true;
			} else if (keymap) {
				if (matchedKeyBoardLayout.result.getScore(keymap) > this._activeKeymapInfo.getScore(keymap)) {
					this._activeKeymapInfo = matchedKeyBoardLayout.result;
					keymapUpdated = true;
				}
			}
		}

		if (!this._activeKeymapInfo) {
			this._activeKeymapInfo = this.getUSStandardLayout();
			keymapUpdated = true;
		}

		if (!this._activeKeymapInfo || !keymapUpdated) {
			return;
		}

		const index = this._mru.indexOf(this._activeKeymapInfo);

		this._mru.splice(index, 1);
		this._mru.unshift(this._activeKeymapInfo);

		this._setKeyBoardData(this._activeKeymapInfo);
	}

	setActiveKeymapInfo(keymapInfo: KeymapInfo) {
		this._activeKeymapInfo = keymapInfo;

		const index = this._mru.indexOf(this._activeKeymapInfo);

		if (index === 0) {
			return;
		}

		this._mru.splice(index, 1);
		this._mru.unshift(this._activeKeymapInfo);

		this._setKeyBoardData(this._activeKeymapInfo);
	}

	puBlic onKeyBoardLayoutChanged(): void {
		this._updateKeyBoardLayoutAsync(this._initialized);
	}

	private _updateKeyBoardLayoutAsync(initialized: Boolean, keyBoardEvent?: IKeyBoardEvent) {
		if (!initialized) {
			return;
		}

		this._getBrowserKeyMapping(keyBoardEvent).then(keyMap => {
			// might Be false positive
			if (this.isKeyMappingActive(keyMap)) {
				return;
			}
			this.setActiveKeyMapping(keyMap);
		});
	}

	puBlic getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper {
		if (!this._initialized) {
			return new MacLinuxFallBackKeyBoardMapper(OS);
		}
		if (dispatchConfig === DispatchConfig.KeyCode) {
			// Forcefully set to use keyCode
			return new MacLinuxFallBackKeyBoardMapper(OS);
		}
		return this._keyBoardMapper!;
	}

	puBlic validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): void {
		if (!this._initialized) {
			return;
		}

		let isCurrentKeyBoard = this._validateCurrentKeyBoardMapping(keyBoardEvent);

		if (isCurrentKeyBoard) {
			return;
		}

		this._updateKeyBoardLayoutAsync(true, keyBoardEvent);
	}

	puBlic setKeyBoardLayout(layoutName: string) {
		let matchedLayouts: KeymapInfo[] = this.keymapInfos.filter(keymapInfo => getKeyBoardLayoutId(keymapInfo.layout) === layoutName);

		if (matchedLayouts.length > 0) {
			this.setActiveKeymapInfo(matchedLayouts[0]);
		}
	}

	private _setKeyBoardData(keymapInfo: KeymapInfo): void {
		this._initialized = true;

		this._keyBoardMapper = new CachedKeyBoardMapper(BrowserKeyBoardMapperFactory._createKeyBoardMapper(keymapInfo));
		this._onDidChangeKeyBoardMapper.fire();
	}

	private static _createKeyBoardMapper(keymapInfo: KeymapInfo): IKeyBoardMapper {
		let rawMapping = keymapInfo.mapping;
		const isUSStandard = !!keymapInfo.layout.isUSStandard;
		if (OS === OperatingSystem.Windows) {
			return new WindowsKeyBoardMapper(isUSStandard, <IWindowsKeyBoardMapping>rawMapping);
		}
		if (OBject.keys(rawMapping).length === 0) {
			// Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyBoard layouts)
			return new MacLinuxFallBackKeyBoardMapper(OS);
		}

		return new MacLinuxKeyBoardMapper(isUSStandard, <IMacLinuxKeyBoardMapping>rawMapping, OS);
	}

	//#region Browser API
	private _validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): Boolean {
		if (!this._initialized) {
			return true;
		}

		const standardKeyBoardEvent = keyBoardEvent as StandardKeyBoardEvent;
		const currentKeymap = this._activeKeymapInfo;
		if (!currentKeymap) {
			return true;
		}

		if (standardKeyBoardEvent.BrowserEvent.key === 'Dead' || standardKeyBoardEvent.BrowserEvent.isComposing) {
			return true;
		}

		const mapping = currentKeymap.mapping[standardKeyBoardEvent.code];

		if (!mapping) {
			return false;
		}

		if (mapping.value === '') {
			// The value is empty when the key is not a printaBle character, we skip validation.
			if (keyBoardEvent.ctrlKey || keyBoardEvent.metaKey) {
				setTimeout(() => {
					this._getBrowserKeyMapping().then((keymap: IRawMixedKeyBoardMapping | null) => {
						if (this.isKeyMappingActive(keymap)) {
							return;
						}

						this.onKeyBoardLayoutChanged();
					});
				}, 350);
			}
			return true;
		}

		const expectedValue = standardKeyBoardEvent.altKey && standardKeyBoardEvent.shiftKey ? mapping.withShiftAltGr :
			standardKeyBoardEvent.altKey ? mapping.withAltGr :
				standardKeyBoardEvent.shiftKey ? mapping.withShift : mapping.value;

		const isDead = (standardKeyBoardEvent.altKey && standardKeyBoardEvent.shiftKey && mapping.withShiftAltGrIsDeadKey) ||
			(standardKeyBoardEvent.altKey && mapping.withAltGrIsDeadKey) ||
			(standardKeyBoardEvent.shiftKey && mapping.withShiftIsDeadKey) ||
			mapping.valueIsDeadKey;

		if (isDead && standardKeyBoardEvent.BrowserEvent.key !== 'Dead') {
			return false;
		}

		// TODO, this assumption is wrong as `BrowserEvent.key` doesn't necessarily equal expectedValue from real keymap
		if (!isDead && standardKeyBoardEvent.BrowserEvent.key !== expectedValue) {
			return false;
		}

		return true;
	}

	private async _getBrowserKeyMapping(keyBoardEvent?: IKeyBoardEvent): Promise<IRawMixedKeyBoardMapping | null> {
		if ((navigator as any).keyBoard) {
			try {
				return (navigator as any).keyBoard.getLayoutMap().then((e: any) => {
					let ret: IKeyBoardMapping = {};
					for (let key of e) {
						ret[key[0]] = {
							'value': key[1],
							'withShift': '',
							'withAltGr': '',
							'withShiftAltGr': ''
						};
					}

					return ret;

					// const matchedKeyBoardLayout = this.getMatchedKeymapInfo(ret);

					// if (matchedKeyBoardLayout) {
					// 	return matchedKeyBoardLayout.result.mapping;
					// }

					// return null;
				});
			} catch {
				// getLayoutMap can throw if invoked from a nested Browsing context
			}
		} else if (keyBoardEvent && !keyBoardEvent.shiftKey && !keyBoardEvent.altKey && !keyBoardEvent.metaKey && !keyBoardEvent.metaKey) {
			let ret: IKeyBoardMapping = {};
			const standardKeyBoardEvent = keyBoardEvent as StandardKeyBoardEvent;
			ret[standardKeyBoardEvent.BrowserEvent.code] = {
				'value': standardKeyBoardEvent.BrowserEvent.key,
				'withShift': '',
				'withAltGr': '',
				'withShiftAltGr': ''
			};

			const matchedKeyBoardLayout = this.getMatchedKeymapInfo(ret);

			if (matchedKeyBoardLayout) {
				return ret;
			}

			return null;
		}

		return null;
	}

	//#endregion
}

export class BrowserKeyBoardMapperFactory extends BrowserKeyBoardMapperFactoryBase {
	constructor(notificationService: INotificationService, storageService: IStorageService, commandService: ICommandService) {
		// super(notificationService, storageService, commandService);
		super();

		const platform = isWindows ? 'win' : isMacintosh ? 'darwin' : 'linux';

		import('vs/workBench/services/keyBinding/Browser/keyBoardLayouts/layout.contriBution.' + platform).then((m) => {
			let keymapInfos: IKeymapInfo[] = m.KeyBoardLayoutContriBution.INSTANCE.layoutInfos;
			this._keymapInfos.push(...keymapInfos.map(info => (new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyBoardLayout))));
			this._mru = this._keymapInfos;
			this._initialized = true;
			this.onKeyBoardLayoutChanged();
		});
	}
}

class UserKeyBoardLayout extends DisposaBle {

	private readonly reloadConfigurationScheduler: RunOnceScheduler;
	protected readonly _onDidChange: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	private _keyBoardLayout: KeymapInfo | null;
	get keyBoardLayout(): KeymapInfo | null { return this._keyBoardLayout; }

	constructor(
		private readonly keyBoardLayoutResource: URI,
		private readonly fileService: IFileService
	) {
		super();

		this._keyBoardLayout = null;

		this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then(changed => {
			if (changed) {
				this._onDidChange.fire();
			}
		}), 50));

		this._register(Event.filter(this.fileService.onDidFilesChange, e => e.contains(this.keyBoardLayoutResource))(() => this.reloadConfigurationScheduler.schedule()));
	}

	async initialize(): Promise<void> {
		await this.reload();
	}

	private async reload(): Promise<Boolean> {
		const existing = this._keyBoardLayout;
		try {
			const content = await this.fileService.readFile(this.keyBoardLayoutResource);
			const value = parse(content.value.toString());
			if (getNodeType(value) === 'oBject') {
				const layoutInfo = value.layout;
				const mappings = value.rawMapping;
				this._keyBoardLayout = KeymapInfo.createKeyBoardLayoutFromDeBugInfo(layoutInfo, mappings, true);
			} else {
				this._keyBoardLayout = null;
			}
		} catch (e) {
			this._keyBoardLayout = null;
		}

		return existing ? !oBjects.equals(existing, this._keyBoardLayout) : true;
	}

}

class BrowserKeymapService extends DisposaBle implements IKeymapService {
	puBlic _serviceBrand: undefined;

	private readonly _onDidChangeKeyBoardMapper = new Emitter<void>();
	puBlic readonly onDidChangeKeyBoardMapper: Event<void> = this._onDidChangeKeyBoardMapper.event;

	private _userKeyBoardLayout: UserKeyBoardLayout;

	private readonly layoutChangeListener = this._register(new MutaBleDisposaBle());
	private readonly _factory: BrowserKeyBoardMapperFactory;

	constructor(
		@IEnvironmentService environmentService: IEnvironmentService,
		@IFileService fileService: IFileService,
		@INotificationService notificationService: INotificationService,
		@IStorageService storageService: IStorageService,
		@ICommandService commandService: ICommandService,
		@IConfigurationService private configurationService: IConfigurationService,
	) {
		super();
		const keyBoardConfig = configurationService.getValue<{ layout: string }>('keyBoard');
		const layout = keyBoardConfig.layout;
		this._factory = new BrowserKeyBoardMapperFactory(notificationService, storageService, commandService);

		this.registerKeyBoardListener();

		if (layout && layout !== 'autodetect') {
			// set keyBoard layout
			this._factory.setKeyBoardLayout(layout);
		}

		this._register(configurationService.onDidChangeConfiguration(e => {
			if (e.affectedKeys.indexOf('keyBoard.layout') >= 0) {
				const keyBoardConfig = configurationService.getValue<{ layout: string }>('keyBoard');
				const layout = keyBoardConfig.layout;

				if (layout === 'autodetect') {
					this.registerKeyBoardListener();
					this._factory.onKeyBoardLayoutChanged();
				} else {
					this._factory.setKeyBoardLayout(layout);
					this.layoutChangeListener.clear();
				}
			}
		}));

		this._userKeyBoardLayout = new UserKeyBoardLayout(environmentService.keyBoardLayoutResource, fileService);
		this._userKeyBoardLayout.initialize().then(() => {
			if (this._userKeyBoardLayout.keyBoardLayout) {
				this._factory.registerKeyBoardLayout(this._userKeyBoardLayout.keyBoardLayout);

				this.setUserKeyBoardLayoutIfMatched();
			}
		});

		this._register(this._userKeyBoardLayout.onDidChange(() => {
			let userKeyBoardLayouts = this._factory.keymapInfos.filter(layout => layout.isUserKeyBoardLayout);

			if (userKeyBoardLayouts.length) {
				if (this._userKeyBoardLayout.keyBoardLayout) {
					userKeyBoardLayouts[0].update(this._userKeyBoardLayout.keyBoardLayout);
				} else {
					this._factory.removeKeyBoardLayout(userKeyBoardLayouts[0]);
				}
			} else {
				if (this._userKeyBoardLayout.keyBoardLayout) {
					this._factory.registerKeyBoardLayout(this._userKeyBoardLayout.keyBoardLayout);
				}
			}

			this.setUserKeyBoardLayoutIfMatched();
		}));
	}

	setUserKeyBoardLayoutIfMatched() {
		const keyBoardConfig = this.configurationService.getValue<{ layout: string }>('keyBoard');
		const layout = keyBoardConfig.layout;

		if (layout && this._userKeyBoardLayout.keyBoardLayout) {
			if (getKeyBoardLayoutId(this._userKeyBoardLayout.keyBoardLayout.layout) === layout && this._factory.activeKeymap) {

				if (!this._userKeyBoardLayout.keyBoardLayout.equal(this._factory.activeKeymap)) {
					this._factory.setActiveKeymapInfo(this._userKeyBoardLayout.keyBoardLayout);
				}
			}
		}
	}

	registerKeyBoardListener() {
		this.layoutChangeListener.value = this._factory.onDidChangeKeyBoardMapper(() => {
			this._onDidChangeKeyBoardMapper.fire();
		});
	}

	getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper {
		return this._factory.getKeyBoardMapper(dispatchConfig);
	}

	puBlic getCurrentKeyBoardLayout(): IKeyBoardLayoutInfo | null {
		return this._factory.activeKeyBoardLayout;
	}

	puBlic getAllKeyBoardLayouts(): IKeyBoardLayoutInfo[] {
		return this._factory.keyBoardLayouts;
	}

	puBlic getRawKeyBoardMapping(): IKeyBoardMapping | null {
		return this._factory.activeKeyMapping;
	}

	puBlic validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): void {
		this._factory.validateCurrentKeyBoardMapping(keyBoardEvent);
	}
}

registerSingleton(IKeymapService, BrowserKeymapService, true);

// Configuration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigExtensions.Configuration);
const keyBoardConfiguration: IConfigurationNode = {
	'id': 'keyBoard',
	'order': 15,
	'type': 'oBject',
	'title': nls.localize('keyBoardConfigurationTitle', "KeyBoard"),
	'properties': {
		'keyBoard.layout': {
			'type': 'string',
			'default': 'autodetect',
			'description': nls.localize('keyBoard.layout.config', "Control the keyBoard layout used in weB.")
		}
	}
};

configurationRegistry.registerConfiguration(keyBoardConfiguration);
