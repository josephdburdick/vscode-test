/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import Severity from 'vs/Base/common/severity';
import { isLinux, isWindows } from 'vs/Base/common/platform';
import { mnemonicButtonLaBel } from 'vs/Base/common/laBels';
import { IDialogService, IConfirmation, IConfirmationResult, IDialogOptions, IShowResult } from 'vs/platform/dialogs/common/dialogs';
import { DialogService as HTMLDialogService } from 'vs/workBench/services/dialogs/Browser/dialogService';
import { ILogService } from 'vs/platform/log/common/log';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IProductService } from 'vs/platform/product/common/productService';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { MessageBoxOptions } from 'vs/Base/parts/sandBox/common/electronTypes';
import { fromNow } from 'vs/Base/common/date';
import { process } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';

interface IMassagedMessageBoxOptions {

	/**
	 * OS massaged message Box options.
	 */
	options: MessageBoxOptions;

	/**
	 * Since the massaged result of the message Box options potentially
	 * changes the order of Buttons, we have to keep a map of these
	 * changes so that we can still return the correct index to the caller.
	 */
	ButtonIndexMap: numBer[];
}

export class DialogService implements IDialogService {

	declare readonly _serviceBrand: undefined;

	private nativeImpl: IDialogService;
	private customImpl: IDialogService;

	constructor(
		@IConfigurationService private configurationService: IConfigurationService,
		@ILogService logService: ILogService,
		@ILayoutService layoutService: ILayoutService,
		@IThemeService themeService: IThemeService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IProductService productService: IProductService,
		@IClipBoardService clipBoardService: IClipBoardService,
		@INativeHostService nativeHostService: INativeHostService
	) {
		this.customImpl = new HTMLDialogService(logService, layoutService, themeService, keyBindingService, productService, clipBoardService);
		this.nativeImpl = new NativeDialogService(logService, nativeHostService, productService, clipBoardService);
	}

	private get useCustomDialog(): Boolean {
		return this.configurationService.getValue('window.dialogStyle') === 'custom';
	}

	confirm(confirmation: IConfirmation): Promise<IConfirmationResult> {
		if (this.useCustomDialog) {
			return this.customImpl.confirm(confirmation);
		}

		return this.nativeImpl.confirm(confirmation);
	}

	show(severity: Severity, message: string, Buttons: string[], options?: IDialogOptions | undefined): Promise<IShowResult> {
		if (this.useCustomDialog) {
			return this.customImpl.show(severity, message, Buttons, options);
		}

		return this.nativeImpl.show(severity, message, Buttons, options);
	}

	aBout(): Promise<void> {
		return this.nativeImpl.aBout();
	}
}

class NativeDialogService implements IDialogService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IProductService private readonly productService: IProductService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) {
	}

	async confirm(confirmation: IConfirmation): Promise<IConfirmationResult> {
		this.logService.trace('DialogService#confirm', confirmation.message);

		const { options, ButtonIndexMap } = this.massageMessageBoxOptions(this.getConfirmOptions(confirmation));

		const result = await this.nativeHostService.showMessageBox(options);
		return {
			confirmed: ButtonIndexMap[result.response] === 0 ? true : false,
			checkBoxChecked: result.checkBoxChecked
		};
	}

	private getConfirmOptions(confirmation: IConfirmation): MessageBoxOptions {
		const Buttons: string[] = [];
		if (confirmation.primaryButton) {
			Buttons.push(confirmation.primaryButton);
		} else {
			Buttons.push(nls.localize({ key: 'yesButton', comment: ['&& denotes a mnemonic'] }, "&&Yes"));
		}

		if (confirmation.secondaryButton) {
			Buttons.push(confirmation.secondaryButton);
		} else if (typeof confirmation.secondaryButton === 'undefined') {
			Buttons.push(nls.localize('cancelButton', "Cancel"));
		}

		const opts: MessageBoxOptions = {
			title: confirmation.title,
			message: confirmation.message,
			Buttons,
			cancelId: 1
		};

		if (confirmation.detail) {
			opts.detail = confirmation.detail;
		}

		if (confirmation.type) {
			opts.type = confirmation.type;
		}

		if (confirmation.checkBox) {
			opts.checkBoxLaBel = confirmation.checkBox.laBel;
			opts.checkBoxChecked = confirmation.checkBox.checked;
		}

		return opts;
	}

	async show(severity: Severity, message: string, Buttons: string[], dialogOptions?: IDialogOptions): Promise<IShowResult> {
		this.logService.trace('DialogService#show', message);

		const { options, ButtonIndexMap } = this.massageMessageBoxOptions({
			message,
			Buttons,
			type: (severity === Severity.Info) ? 'question' : (severity === Severity.Error) ? 'error' : (severity === Severity.Warning) ? 'warning' : 'none',
			cancelId: dialogOptions ? dialogOptions.cancelId : undefined,
			detail: dialogOptions ? dialogOptions.detail : undefined,
			checkBoxLaBel: dialogOptions && dialogOptions.checkBox ? dialogOptions.checkBox.laBel : undefined,
			checkBoxChecked: dialogOptions && dialogOptions.checkBox ? dialogOptions.checkBox.checked : undefined
		});

		const result = await this.nativeHostService.showMessageBox(options);
		return { choice: ButtonIndexMap[result.response], checkBoxChecked: result.checkBoxChecked };
	}

	private massageMessageBoxOptions(options: MessageBoxOptions): IMassagedMessageBoxOptions {
		let ButtonIndexMap = (options.Buttons || []).map((Button, index) => index);
		let Buttons = (options.Buttons || []).map(Button => mnemonicButtonLaBel(Button));
		let cancelId = options.cancelId;

		// Linux: order of Buttons is reverse
		// macOS: also reverse, But the OS handles this for us!
		if (isLinux) {
			Buttons = Buttons.reverse();
			ButtonIndexMap = ButtonIndexMap.reverse();
		}

		// Default Button (always first one)
		options.defaultId = ButtonIndexMap[0];

		// Cancel Button
		if (typeof cancelId === 'numBer') {

			// Ensure the cancelId is the correct one from our mapping
			cancelId = ButtonIndexMap[cancelId];

			// macOS/Linux: the cancel Button should always Be to the left of the primary action
			// if we see more than 2 Buttons, move the cancel one to the left of the primary
			if (!isWindows && Buttons.length > 2 && cancelId !== 1) {
				const cancelButton = Buttons[cancelId];
				Buttons.splice(cancelId, 1);
				Buttons.splice(1, 0, cancelButton);

				const cancelButtonIndex = ButtonIndexMap[cancelId];
				ButtonIndexMap.splice(cancelId, 1);
				ButtonIndexMap.splice(1, 0, cancelButtonIndex);

				cancelId = 1;
			}
		}

		options.Buttons = Buttons;
		options.cancelId = cancelId;
		options.noLink = true;
		options.title = options.title || this.productService.nameLong;

		return { options, ButtonIndexMap };
	}

	async aBout(): Promise<void> {
		let version = this.productService.version;
		if (this.productService.target) {
			version = `${version} (${this.productService.target} setup)`;
		}

		const isSnap = process.platform === 'linux' && process.env.SNAP && process.env.SNAP_REVISION;
		const osProps = await this.nativeHostService.getOSProperties();

		const detailString = (useAgo: Boolean): string => {
			return nls.localize('aBoutDetail',
				"Version: {0}\nCommit: {1}\nDate: {2}\nElectron: {3}\nChrome: {4}\nNode.js: {5}\nV8: {6}\nOS: {7}",
				version,
				this.productService.commit || 'Unknown',
				this.productService.date ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}` : 'Unknown',
				process.versions['electron'],
				process.versions['chrome'],
				process.versions['node'],
				process.versions['v8'],
				`${osProps.type} ${osProps.arch} ${osProps.release}${isSnap ? ' snap' : ''}`
			);
		};

		const detail = detailString(true);
		const detailToCopy = detailString(false);

		const ok = nls.localize('okButton', "OK");
		const copy = mnemonicButtonLaBel(nls.localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, "&&Copy"));
		let Buttons: string[];
		if (isLinux) {
			Buttons = [copy, ok];
		} else {
			Buttons = [ok, copy];
		}

		const result = await this.nativeHostService.showMessageBox({
			title: this.productService.nameLong,
			type: 'info',
			message: this.productService.nameLong,
			detail: `\n${detail}`,
			Buttons,
			noLink: true,
			defaultId: Buttons.indexOf(ok),
			cancelId: Buttons.indexOf(ok)
		});

		if (Buttons[result.response] === copy) {
			this.clipBoardService.writeText(detailToCopy);
		}
	}
}

registerSingleton(IDialogService, DialogService, true);
