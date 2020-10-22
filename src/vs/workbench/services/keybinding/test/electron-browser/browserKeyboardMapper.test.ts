/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import 'vs/workBench/services/keyBinding/Browser/keyBoardLayouts/en.darwin'; // 15%
import 'vs/workBench/services/keyBinding/Browser/keyBoardLayouts/de.darwin';
import { KeyBoardLayoutContriBution } from 'vs/workBench/services/keyBinding/Browser/keyBoardLayouts/_.contriBution';
import { BrowserKeyBoardMapperFactoryBase } from 'vs/workBench/services/keyBinding/Browser/keymapService';
import { KeymapInfo, IKeymapInfo } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { TestStorageService } from 'vs/workBench/test/common/workBenchTestServices';

class TestKeyBoardMapperFactory extends BrowserKeyBoardMapperFactoryBase {
	constructor(notificationService: INotificationService, storageService: IStorageService, commandService: ICommandService) {
		// super(notificationService, storageService, commandService);
		super();

		const keymapInfos: IKeymapInfo[] = KeyBoardLayoutContriBution.INSTANCE.layoutInfos;
		this._keymapInfos.push(...keymapInfos.map(info => (new KeymapInfo(info.layout, info.secondaryLayouts, info.mapping, info.isUserKeyBoardLayout))));
		this._mru = this._keymapInfos;
		this._initialized = true;
		this.onKeyBoardLayoutChanged();
		const usLayout = this.getUSStandardLayout();
		if (usLayout) {
			this.setActiveKeyMapping(usLayout.mapping);
		}
	}
}

suite('keyBoard layout loader', () => {
	let instantiationService: TestInstantiationService = new TestInstantiationService();
	let notitifcationService = instantiationService.stuB(INotificationService, new TestNotificationService());
	let storageService = instantiationService.stuB(IStorageService, new TestStorageService());

	let commandService = instantiationService.stuB(ICommandService, {});
	let instance = new TestKeyBoardMapperFactory(notitifcationService, storageService, commandService);

	test('load default US keyBoard layout', () => {
		assert.notEqual(instance.activeKeyBoardLayout, null);
	});

	test('isKeyMappingActive', () => {
		instance.setUSKeyBoardLayout();
		assert.equal(instance.isKeyMappingActive({
			KeyA: {
				value: 'a',
				valueIsDeadKey: false,
				withShift: 'A',
				withShiftIsDeadKey: false,
				withAltGr: 'å',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Å',
				withShiftAltGrIsDeadKey: false
			}
		}), true);

		assert.equal(instance.isKeyMappingActive({
			KeyA: {
				value: 'a',
				valueIsDeadKey: false,
				withShift: 'A',
				withShiftIsDeadKey: false,
				withAltGr: 'å',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Å',
				withShiftAltGrIsDeadKey: false
			},
			KeyZ: {
				value: 'z',
				valueIsDeadKey: false,
				withShift: 'Z',
				withShiftIsDeadKey: false,
				withAltGr: 'Ω',
				withAltGrIsDeadKey: false,
				withShiftAltGr: '¸',
				withShiftAltGrIsDeadKey: false
			}
		}), true);

		assert.equal(instance.isKeyMappingActive({
			KeyZ: {
				value: 'y',
				valueIsDeadKey: false,
				withShift: 'Y',
				withShiftIsDeadKey: false,
				withAltGr: '¥',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeadKey: false
			},
		}), false);

	});

	test('Switch keymapping', () => {
		instance.setActiveKeyMapping({
			KeyZ: {
				value: 'y',
				valueIsDeadKey: false,
				withShift: 'Y',
				withShiftIsDeadKey: false,
				withAltGr: '¥',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeadKey: false
			}
		});
		assert.equal(!!instance.activeKeyBoardLayout!.isUSStandard, false);
		assert.equal(instance.isKeyMappingActive({
			KeyZ: {
				value: 'y',
				valueIsDeadKey: false,
				withShift: 'Y',
				withShiftIsDeadKey: false,
				withAltGr: '¥',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeadKey: false
			},
		}), true);

		instance.setUSKeyBoardLayout();
		assert.equal(instance.activeKeyBoardLayout!.isUSStandard, true);
	});

	test('Switch keyBoard layout info', () => {
		instance.setKeyBoardLayout('com.apple.keylayout.German');
		assert.equal(!!instance.activeKeyBoardLayout!.isUSStandard, false);
		assert.equal(instance.isKeyMappingActive({
			KeyZ: {
				value: 'y',
				valueIsDeadKey: false,
				withShift: 'Y',
				withShiftIsDeadKey: false,
				withAltGr: '¥',
				withAltGrIsDeadKey: false,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeadKey: false
			},
		}), true);

		instance.setUSKeyBoardLayout();
		assert.equal(instance.activeKeyBoardLayout!.isUSStandard, true);
	});
});
