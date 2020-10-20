/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import 'vs/workbench/services/keybinding/browser/keyboArdLAyouts/en.dArwin'; // 15%
import 'vs/workbench/services/keybinding/browser/keyboArdLAyouts/de.dArwin';
import { KeyboArdLAyoutContribution } from 'vs/workbench/services/keybinding/browser/keyboArdLAyouts/_.contribution';
import { BrowserKeyboArdMApperFActoryBAse } from 'vs/workbench/services/keybinding/browser/keymApService';
import { KeymApInfo, IKeymApInfo } from 'vs/workbench/services/keybinding/common/keymApInfo';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';

clAss TestKeyboArdMApperFActory extends BrowserKeyboArdMApperFActoryBAse {
	constructor(notificAtionService: INotificAtionService, storAgeService: IStorAgeService, commAndService: ICommAndService) {
		// super(notificAtionService, storAgeService, commAndService);
		super();

		const keymApInfos: IKeymApInfo[] = KeyboArdLAyoutContribution.INSTANCE.lAyoutInfos;
		this._keymApInfos.push(...keymApInfos.mAp(info => (new KeymApInfo(info.lAyout, info.secondAryLAyouts, info.mApping, info.isUserKeyboArdLAyout))));
		this._mru = this._keymApInfos;
		this._initiAlized = true;
		this.onKeyboArdLAyoutChAnged();
		const usLAyout = this.getUSStAndArdLAyout();
		if (usLAyout) {
			this.setActiveKeyMApping(usLAyout.mApping);
		}
	}
}

suite('keyboArd lAyout loAder', () => {
	let instAntiAtionService: TestInstAntiAtionService = new TestInstAntiAtionService();
	let notitifcAtionService = instAntiAtionService.stub(INotificAtionService, new TestNotificAtionService());
	let storAgeService = instAntiAtionService.stub(IStorAgeService, new TestStorAgeService());

	let commAndService = instAntiAtionService.stub(ICommAndService, {});
	let instAnce = new TestKeyboArdMApperFActory(notitifcAtionService, storAgeService, commAndService);

	test('loAd defAult US keyboArd lAyout', () => {
		Assert.notEquAl(instAnce.ActiveKeyboArdLAyout, null);
	});

	test('isKeyMAppingActive', () => {
		instAnce.setUSKeyboArdLAyout();
		Assert.equAl(instAnce.isKeyMAppingActive({
			KeyA: {
				vAlue: 'A',
				vAlueIsDeAdKey: fAlse,
				withShift: 'A',
				withShiftIsDeAdKey: fAlse,
				withAltGr: 'å',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Å',
				withShiftAltGrIsDeAdKey: fAlse
			}
		}), true);

		Assert.equAl(instAnce.isKeyMAppingActive({
			KeyA: {
				vAlue: 'A',
				vAlueIsDeAdKey: fAlse,
				withShift: 'A',
				withShiftIsDeAdKey: fAlse,
				withAltGr: 'å',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Å',
				withShiftAltGrIsDeAdKey: fAlse
			},
			KeyZ: {
				vAlue: 'z',
				vAlueIsDeAdKey: fAlse,
				withShift: 'Z',
				withShiftIsDeAdKey: fAlse,
				withAltGr: 'Ω',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: '¸',
				withShiftAltGrIsDeAdKey: fAlse
			}
		}), true);

		Assert.equAl(instAnce.isKeyMAppingActive({
			KeyZ: {
				vAlue: 'y',
				vAlueIsDeAdKey: fAlse,
				withShift: 'Y',
				withShiftIsDeAdKey: fAlse,
				withAltGr: '¥',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeAdKey: fAlse
			},
		}), fAlse);

	});

	test('Switch keymApping', () => {
		instAnce.setActiveKeyMApping({
			KeyZ: {
				vAlue: 'y',
				vAlueIsDeAdKey: fAlse,
				withShift: 'Y',
				withShiftIsDeAdKey: fAlse,
				withAltGr: '¥',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeAdKey: fAlse
			}
		});
		Assert.equAl(!!instAnce.ActiveKeyboArdLAyout!.isUSStAndArd, fAlse);
		Assert.equAl(instAnce.isKeyMAppingActive({
			KeyZ: {
				vAlue: 'y',
				vAlueIsDeAdKey: fAlse,
				withShift: 'Y',
				withShiftIsDeAdKey: fAlse,
				withAltGr: '¥',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeAdKey: fAlse
			},
		}), true);

		instAnce.setUSKeyboArdLAyout();
		Assert.equAl(instAnce.ActiveKeyboArdLAyout!.isUSStAndArd, true);
	});

	test('Switch keyboArd lAyout info', () => {
		instAnce.setKeyboArdLAyout('com.Apple.keylAyout.GermAn');
		Assert.equAl(!!instAnce.ActiveKeyboArdLAyout!.isUSStAndArd, fAlse);
		Assert.equAl(instAnce.isKeyMAppingActive({
			KeyZ: {
				vAlue: 'y',
				vAlueIsDeAdKey: fAlse,
				withShift: 'Y',
				withShiftIsDeAdKey: fAlse,
				withAltGr: '¥',
				withAltGrIsDeAdKey: fAlse,
				withShiftAltGr: 'Ÿ',
				withShiftAltGrIsDeAdKey: fAlse
			},
		}), true);

		instAnce.setUSKeyboArdLAyout();
		Assert.equAl(instAnce.ActiveKeyboArdLAyout!.isUSStAndArd, true);
	});
});
