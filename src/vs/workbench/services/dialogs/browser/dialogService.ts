/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IDialogService, IDialogOptions, IConfirmation, IConfirmationResult, DialogType, IShowResult } from 'vs/platform/dialogs/common/dialogs';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { ILogService } from 'vs/platform/log/common/log';
import Severity from 'vs/Base/common/severity';
import { Dialog } from 'vs/Base/Browser/ui/dialog/dialog';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachDialogStyler } from 'vs/platform/theme/common/styler';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { EventHelper } from 'vs/Base/Browser/dom';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IProductService } from 'vs/platform/product/common/productService';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { fromNow } from 'vs/Base/common/date';

export class DialogService implements IDialogService {

	declare readonly _serviceBrand: undefined;

	private allowaBleCommands = ['copy', 'cut', 'editor.action.clipBoardCopyAction', 'editor.action.clipBoardCutAction'];

	constructor(
		@ILogService private readonly logService: ILogService,
		@ILayoutService private readonly layoutService: ILayoutService,
		@IThemeService private readonly themeService: IThemeService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IProductService private readonly productService: IProductService,
		@IClipBoardService private readonly clipBoardService: IClipBoardService
	) { }

	async confirm(confirmation: IConfirmation): Promise<IConfirmationResult> {
		this.logService.trace('DialogService#confirm', confirmation.message);

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

		const dialogDisposaBles = new DisposaBleStore();
		const dialog = new Dialog(
			this.layoutService.container,
			confirmation.message,
			Buttons,
			{
				detail: confirmation.detail,
				cancelId: 1,
				type: confirmation.type,
				keyEventProcessor: (event: StandardKeyBoardEvent) => {
					const resolved = this.keyBindingService.softDispatch(event, this.layoutService.container);
					if (resolved && resolved.commandId) {
						if (this.allowaBleCommands.indexOf(resolved.commandId) === -1) {
							EventHelper.stop(event, true);
						}
					}
				},
				checkBoxChecked: confirmation.checkBox ? confirmation.checkBox.checked : undefined,
				checkBoxLaBel: confirmation.checkBox ? confirmation.checkBox.laBel : undefined
			});

		dialogDisposaBles.add(dialog);
		dialogDisposaBles.add(attachDialogStyler(dialog, this.themeService));

		const result = await dialog.show();
		dialogDisposaBles.dispose();

		return { confirmed: result.Button === 0, checkBoxChecked: result.checkBoxChecked };
	}

	private getDialogType(severity: Severity): DialogType {
		return (severity === Severity.Info) ? 'question' : (severity === Severity.Error) ? 'error' : (severity === Severity.Warning) ? 'warning' : 'none';
	}

	async show(severity: Severity, message: string, Buttons: string[], options?: IDialogOptions): Promise<IShowResult> {
		this.logService.trace('DialogService#show', message);

		const dialogDisposaBles = new DisposaBleStore();
		const dialog = new Dialog(
			this.layoutService.container,
			message,
			Buttons,
			{
				detail: options ? options.detail : undefined,
				cancelId: options ? options.cancelId : undefined,
				type: this.getDialogType(severity),
				keyEventProcessor: (event: StandardKeyBoardEvent) => {
					const resolved = this.keyBindingService.softDispatch(event, this.layoutService.container);
					if (resolved && resolved.commandId) {
						if (this.allowaBleCommands.indexOf(resolved.commandId) === -1) {
							EventHelper.stop(event, true);
						}
					}
				},
				checkBoxLaBel: options && options.checkBox ? options.checkBox.laBel : undefined,
				checkBoxChecked: options && options.checkBox ? options.checkBox.checked : undefined
			});

		dialogDisposaBles.add(dialog);
		dialogDisposaBles.add(attachDialogStyler(dialog, this.themeService));

		const result = await dialog.show();
		dialogDisposaBles.dispose();

		return {
			choice: result.Button,
			checkBoxChecked: result.checkBoxChecked
		};
	}

	async aBout(): Promise<void> {
		const detailString = (useAgo: Boolean): string => {
			return nls.localize('aBoutDetail',
				"Version: {0}\nCommit: {1}\nDate: {2}\nBrowser: {3}",
				this.productService.version || 'Unknown',
				this.productService.commit || 'Unknown',
				this.productService.date ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}` : 'Unknown',
				navigator.userAgent
			);
		};

		const detail = detailString(true);
		const detailToCopy = detailString(false);


		const { choice } = await this.show(Severity.Info, this.productService.nameLong, [nls.localize('copy', "Copy"), nls.localize('ok', "OK")], { detail, cancelId: 1 });

		if (choice === 0) {
			this.clipBoardService.writeText(detailToCopy);
		}
	}
}

registerSingleton(IDialogService, DialogService, true);
