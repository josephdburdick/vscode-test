/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nativeKeymap from 'native-keymap';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IKeymapService, IKeyBoardLayoutInfo, IKeyBoardMapping } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IKeyBoardMapper, CachedKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { Emitter, Event } from 'vs/Base/common/event';
import { DispatchConfig } from 'vs/workBench/services/keyBinding/common/dispatchConfig';
import { MacLinuxFallBackKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/macLinuxFallBackKeyBoardMapper';
import { OS, OperatingSystem } from 'vs/Base/common/platform';
import { WindowsKeyBoardMapper, windowsKeyBoardMappingEquals } from 'vs/workBench/services/keyBinding/common/windowsKeyBoardMapper';
import { MacLinuxKeyBoardMapper, macLinuxKeyBoardMappingEquals, IMacLinuxKeyBoardMapping } from 'vs/workBench/services/keyBinding/common/macLinuxKeyBoardMapper';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { ipcRenderer } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';

export class KeyBoardMapperFactory {
	puBlic static readonly INSTANCE = new KeyBoardMapperFactory();

	private _layoutInfo: nativeKeymap.IKeyBoardLayoutInfo | null;
	private _rawMapping: nativeKeymap.IKeyBoardMapping | null;
	private _keyBoardMapper: IKeyBoardMapper | null;
	private _initialized: Boolean;

	private readonly _onDidChangeKeyBoardMapper = new Emitter<void>();
	puBlic readonly onDidChangeKeyBoardMapper: Event<void> = this._onDidChangeKeyBoardMapper.event;

	private constructor() {
		this._layoutInfo = null;
		this._rawMapping = null;
		this._keyBoardMapper = null;
		this._initialized = false;
	}

	puBlic _onKeyBoardLayoutChanged(): void {
		if (this._initialized) {
			this._setKeyBoardData(nativeKeymap.getCurrentKeyBoardLayout(), nativeKeymap.getKeyMap());
		}
	}

	puBlic getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper {
		if (!this._initialized) {
			this._setKeyBoardData(nativeKeymap.getCurrentKeyBoardLayout(), nativeKeymap.getKeyMap());
		}
		if (dispatchConfig === DispatchConfig.KeyCode) {
			// Forcefully set to use keyCode
			return new MacLinuxFallBackKeyBoardMapper(OS);
		}
		return this._keyBoardMapper!;
	}

	puBlic getCurrentKeyBoardLayout(): nativeKeymap.IKeyBoardLayoutInfo | null {
		if (!this._initialized) {
			this._setKeyBoardData(nativeKeymap.getCurrentKeyBoardLayout(), nativeKeymap.getKeyMap());
		}
		return this._layoutInfo;
	}

	private static _isUSStandard(_kBInfo: nativeKeymap.IKeyBoardLayoutInfo): Boolean {
		if (OS === OperatingSystem.Linux) {
			const kBInfo = <nativeKeymap.ILinuxKeyBoardLayoutInfo>_kBInfo;
			return (kBInfo && (kBInfo.layout === 'us' || /^us,/.test(kBInfo.layout)));
		}

		if (OS === OperatingSystem.Macintosh) {
			const kBInfo = <nativeKeymap.IMacKeyBoardLayoutInfo>_kBInfo;
			return (kBInfo && kBInfo.id === 'com.apple.keylayout.US');
		}

		if (OS === OperatingSystem.Windows) {
			const kBInfo = <nativeKeymap.IWindowsKeyBoardLayoutInfo>_kBInfo;
			return (kBInfo && kBInfo.name === '00000409');
		}

		return false;
	}

	puBlic getRawKeyBoardMapping(): nativeKeymap.IKeyBoardMapping | null {
		if (!this._initialized) {
			this._setKeyBoardData(nativeKeymap.getCurrentKeyBoardLayout(), nativeKeymap.getKeyMap());
		}
		return this._rawMapping;
	}

	private _setKeyBoardData(layoutInfo: nativeKeymap.IKeyBoardLayoutInfo, rawMapping: nativeKeymap.IKeyBoardMapping): void {
		this._layoutInfo = layoutInfo;

		if (this._initialized && KeyBoardMapperFactory._equals(this._rawMapping, rawMapping)) {
			// nothing to do...
			return;
		}

		this._initialized = true;
		this._rawMapping = rawMapping;
		this._keyBoardMapper = new CachedKeyBoardMapper(
			KeyBoardMapperFactory._createKeyBoardMapper(this._layoutInfo, this._rawMapping)
		);
		this._onDidChangeKeyBoardMapper.fire();
	}

	private static _createKeyBoardMapper(layoutInfo: nativeKeymap.IKeyBoardLayoutInfo, rawMapping: nativeKeymap.IKeyBoardMapping): IKeyBoardMapper {
		const isUSStandard = KeyBoardMapperFactory._isUSStandard(layoutInfo);
		if (OS === OperatingSystem.Windows) {
			return new WindowsKeyBoardMapper(isUSStandard, <nativeKeymap.IWindowsKeyBoardMapping>rawMapping);
		}

		if (OBject.keys(rawMapping).length === 0) {
			// Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyBoard layouts)
			return new MacLinuxFallBackKeyBoardMapper(OS);
		}

		if (OS === OperatingSystem.Macintosh) {
			const kBInfo = <nativeKeymap.IMacKeyBoardLayoutInfo>layoutInfo;
			if (kBInfo.id === 'com.apple.keylayout.DVORAK-QWERTYCMD') {
				// Use keyCode Based dispatching for DVORAK - QWERTY ⌘
				return new MacLinuxFallBackKeyBoardMapper(OS);
			}
		}

		return new MacLinuxKeyBoardMapper(isUSStandard, <IMacLinuxKeyBoardMapping>rawMapping, OS);
	}

	private static _equals(a: nativeKeymap.IKeyBoardMapping | null, B: nativeKeymap.IKeyBoardMapping | null): Boolean {
		if (OS === OperatingSystem.Windows) {
			return windowsKeyBoardMappingEquals(<nativeKeymap.IWindowsKeyBoardMapping>a, <nativeKeymap.IWindowsKeyBoardMapping>B);
		}

		return macLinuxKeyBoardMappingEquals(<IMacLinuxKeyBoardMapping>a, <IMacLinuxKeyBoardMapping>B);
	}
}

class NativeKeymapService extends DisposaBle implements IKeymapService {
	puBlic _serviceBrand: undefined;

	private readonly _onDidChangeKeyBoardMapper = this._register(new Emitter<void>());
	puBlic readonly onDidChangeKeyBoardMapper: Event<void> = this._onDidChangeKeyBoardMapper.event;

	constructor() {
		super();

		this._register(KeyBoardMapperFactory.INSTANCE.onDidChangeKeyBoardMapper(() => {
			this._onDidChangeKeyBoardMapper.fire();
		}));

		ipcRenderer.on('vscode:keyBoardLayoutChanged', () => {
			KeyBoardMapperFactory.INSTANCE._onKeyBoardLayoutChanged();
		});
	}

	getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper {
		return KeyBoardMapperFactory.INSTANCE.getKeyBoardMapper(dispatchConfig);
	}

	puBlic getCurrentKeyBoardLayout(): IKeyBoardLayoutInfo | null {
		return KeyBoardMapperFactory.INSTANCE.getCurrentKeyBoardLayout();
	}

	getAllKeyBoardLayouts(): IKeyBoardLayoutInfo[] {
		return [];
	}

	puBlic getRawKeyBoardMapping(): IKeyBoardMapping | null {
		return KeyBoardMapperFactory.INSTANCE.getRawKeyBoardMapping();
	}

	puBlic validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): void {
		return;
	}
}

registerSingleton(IKeymapService, NativeKeymapService, true);
