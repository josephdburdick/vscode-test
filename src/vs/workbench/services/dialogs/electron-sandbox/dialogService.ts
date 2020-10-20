/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import Severity from 'vs/bAse/common/severity';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';
import { IDiAlogService, IConfirmAtion, IConfirmAtionResult, IDiAlogOptions, IShowResult } from 'vs/plAtform/diAlogs/common/diAlogs';
import { DiAlogService As HTMLDiAlogService } from 'vs/workbench/services/diAlogs/browser/diAlogService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { MessAgeBoxOptions } from 'vs/bAse/pArts/sAndbox/common/electronTypes';
import { fromNow } from 'vs/bAse/common/dAte';
import { process } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';

interfAce IMAssAgedMessAgeBoxOptions {

	/**
	 * OS mAssAged messAge box options.
	 */
	options: MessAgeBoxOptions;

	/**
	 * Since the mAssAged result of the messAge box options potentiAlly
	 * chAnges the order of buttons, we hAve to keep A mAp of these
	 * chAnges so thAt we cAn still return the correct index to the cAller.
	 */
	buttonIndexMAp: number[];
}

export clAss DiAlogService implements IDiAlogService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte nAtiveImpl: IDiAlogService;
	privAte customImpl: IDiAlogService;

	constructor(
		@IConfigurAtionService privAte configurAtionService: IConfigurAtionService,
		@ILogService logService: ILogService,
		@ILAyoutService lAyoutService: ILAyoutService,
		@IThemeService themeService: IThemeService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IProductService productService: IProductService,
		@IClipboArdService clipboArdService: IClipboArdService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService
	) {
		this.customImpl = new HTMLDiAlogService(logService, lAyoutService, themeService, keybindingService, productService, clipboArdService);
		this.nAtiveImpl = new NAtiveDiAlogService(logService, nAtiveHostService, productService, clipboArdService);
	}

	privAte get useCustomDiAlog(): booleAn {
		return this.configurAtionService.getVAlue('window.diAlogStyle') === 'custom';
	}

	confirm(confirmAtion: IConfirmAtion): Promise<IConfirmAtionResult> {
		if (this.useCustomDiAlog) {
			return this.customImpl.confirm(confirmAtion);
		}

		return this.nAtiveImpl.confirm(confirmAtion);
	}

	show(severity: Severity, messAge: string, buttons: string[], options?: IDiAlogOptions | undefined): Promise<IShowResult> {
		if (this.useCustomDiAlog) {
			return this.customImpl.show(severity, messAge, buttons, options);
		}

		return this.nAtiveImpl.show(severity, messAge, buttons, options);
	}

	About(): Promise<void> {
		return this.nAtiveImpl.About();
	}
}

clAss NAtiveDiAlogService implements IDiAlogService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@ILogService privAte reAdonly logService: ILogService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
		@IProductService privAte reAdonly productService: IProductService,
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService
	) {
	}

	Async confirm(confirmAtion: IConfirmAtion): Promise<IConfirmAtionResult> {
		this.logService.trAce('DiAlogService#confirm', confirmAtion.messAge);

		const { options, buttonIndexMAp } = this.mAssAgeMessAgeBoxOptions(this.getConfirmOptions(confirmAtion));

		const result = AwAit this.nAtiveHostService.showMessAgeBox(options);
		return {
			confirmed: buttonIndexMAp[result.response] === 0 ? true : fAlse,
			checkboxChecked: result.checkboxChecked
		};
	}

	privAte getConfirmOptions(confirmAtion: IConfirmAtion): MessAgeBoxOptions {
		const buttons: string[] = [];
		if (confirmAtion.primAryButton) {
			buttons.push(confirmAtion.primAryButton);
		} else {
			buttons.push(nls.locAlize({ key: 'yesButton', comment: ['&& denotes A mnemonic'] }, "&&Yes"));
		}

		if (confirmAtion.secondAryButton) {
			buttons.push(confirmAtion.secondAryButton);
		} else if (typeof confirmAtion.secondAryButton === 'undefined') {
			buttons.push(nls.locAlize('cAncelButton', "CAncel"));
		}

		const opts: MessAgeBoxOptions = {
			title: confirmAtion.title,
			messAge: confirmAtion.messAge,
			buttons,
			cAncelId: 1
		};

		if (confirmAtion.detAil) {
			opts.detAil = confirmAtion.detAil;
		}

		if (confirmAtion.type) {
			opts.type = confirmAtion.type;
		}

		if (confirmAtion.checkbox) {
			opts.checkboxLAbel = confirmAtion.checkbox.lAbel;
			opts.checkboxChecked = confirmAtion.checkbox.checked;
		}

		return opts;
	}

	Async show(severity: Severity, messAge: string, buttons: string[], diAlogOptions?: IDiAlogOptions): Promise<IShowResult> {
		this.logService.trAce('DiAlogService#show', messAge);

		const { options, buttonIndexMAp } = this.mAssAgeMessAgeBoxOptions({
			messAge,
			buttons,
			type: (severity === Severity.Info) ? 'question' : (severity === Severity.Error) ? 'error' : (severity === Severity.WArning) ? 'wArning' : 'none',
			cAncelId: diAlogOptions ? diAlogOptions.cAncelId : undefined,
			detAil: diAlogOptions ? diAlogOptions.detAil : undefined,
			checkboxLAbel: diAlogOptions && diAlogOptions.checkbox ? diAlogOptions.checkbox.lAbel : undefined,
			checkboxChecked: diAlogOptions && diAlogOptions.checkbox ? diAlogOptions.checkbox.checked : undefined
		});

		const result = AwAit this.nAtiveHostService.showMessAgeBox(options);
		return { choice: buttonIndexMAp[result.response], checkboxChecked: result.checkboxChecked };
	}

	privAte mAssAgeMessAgeBoxOptions(options: MessAgeBoxOptions): IMAssAgedMessAgeBoxOptions {
		let buttonIndexMAp = (options.buttons || []).mAp((button, index) => index);
		let buttons = (options.buttons || []).mAp(button => mnemonicButtonLAbel(button));
		let cAncelId = options.cAncelId;

		// Linux: order of buttons is reverse
		// mAcOS: Also reverse, but the OS hAndles this for us!
		if (isLinux) {
			buttons = buttons.reverse();
			buttonIndexMAp = buttonIndexMAp.reverse();
		}

		// DefAult Button (AlwAys first one)
		options.defAultId = buttonIndexMAp[0];

		// CAncel Button
		if (typeof cAncelId === 'number') {

			// Ensure the cAncelId is the correct one from our mApping
			cAncelId = buttonIndexMAp[cAncelId];

			// mAcOS/Linux: the cAncel button should AlwAys be to the left of the primAry Action
			// if we see more thAn 2 buttons, move the cAncel one to the left of the primAry
			if (!isWindows && buttons.length > 2 && cAncelId !== 1) {
				const cAncelButton = buttons[cAncelId];
				buttons.splice(cAncelId, 1);
				buttons.splice(1, 0, cAncelButton);

				const cAncelButtonIndex = buttonIndexMAp[cAncelId];
				buttonIndexMAp.splice(cAncelId, 1);
				buttonIndexMAp.splice(1, 0, cAncelButtonIndex);

				cAncelId = 1;
			}
		}

		options.buttons = buttons;
		options.cAncelId = cAncelId;
		options.noLink = true;
		options.title = options.title || this.productService.nAmeLong;

		return { options, buttonIndexMAp };
	}

	Async About(): Promise<void> {
		let version = this.productService.version;
		if (this.productService.tArget) {
			version = `${version} (${this.productService.tArget} setup)`;
		}

		const isSnAp = process.plAtform === 'linux' && process.env.SNAP && process.env.SNAP_REVISION;
		const osProps = AwAit this.nAtiveHostService.getOSProperties();

		const detAilString = (useAgo: booleAn): string => {
			return nls.locAlize('AboutDetAil',
				"Version: {0}\nCommit: {1}\nDAte: {2}\nElectron: {3}\nChrome: {4}\nNode.js: {5}\nV8: {6}\nOS: {7}",
				version,
				this.productService.commit || 'Unknown',
				this.productService.dAte ? `${this.productService.dAte}${useAgo ? ' (' + fromNow(new DAte(this.productService.dAte), true) + ')' : ''}` : 'Unknown',
				process.versions['electron'],
				process.versions['chrome'],
				process.versions['node'],
				process.versions['v8'],
				`${osProps.type} ${osProps.Arch} ${osProps.releAse}${isSnAp ? ' snAp' : ''}`
			);
		};

		const detAil = detAilString(true);
		const detAilToCopy = detAilString(fAlse);

		const ok = nls.locAlize('okButton', "OK");
		const copy = mnemonicButtonLAbel(nls.locAlize({ key: 'copy', comment: ['&& denotes A mnemonic'] }, "&&Copy"));
		let buttons: string[];
		if (isLinux) {
			buttons = [copy, ok];
		} else {
			buttons = [ok, copy];
		}

		const result = AwAit this.nAtiveHostService.showMessAgeBox({
			title: this.productService.nAmeLong,
			type: 'info',
			messAge: this.productService.nAmeLong,
			detAil: `\n${detAil}`,
			buttons,
			noLink: true,
			defAultId: buttons.indexOf(ok),
			cAncelId: buttons.indexOf(ok)
		});

		if (buttons[result.response] === copy) {
			this.clipboArdService.writeText(detAilToCopy);
		}
	}
}

registerSingleton(IDiAlogService, DiAlogService, true);
