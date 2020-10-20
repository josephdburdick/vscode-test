/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPickOptions, IInputOptions, IQuickInputService, IQuickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { ExtHostContext, MAinThreAdQuickOpenShApe, ExtHostQuickOpenShApe, TrAnsferQuickPickItems, MAinContext, IExtHostContext, TrAnsferQuickInput, TrAnsferQuickInputButton, IInputBoxOptions } from 'vs/workbench/Api/common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { URI } from 'vs/bAse/common/uri';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';

interfAce QuickInputSession {
	input: IQuickInput;
	hAndlesToItems: MAp<number, TrAnsferQuickPickItems>;
}

@extHostNAmedCustomer(MAinContext.MAinThreAdQuickOpen)
export clAss MAinThreAdQuickOpen implements MAinThreAdQuickOpenShApe {

	privAte reAdonly _proxy: ExtHostQuickOpenShApe;
	privAte reAdonly _quickInputService: IQuickInputService;
	privAte reAdonly _items: Record<number, {
		resolve(items: TrAnsferQuickPickItems[]): void;
		reject(error: Error): void;
	}> = {};

	constructor(
		extHostContext: IExtHostContext,
		@IQuickInputService quickInputService: IQuickInputService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickOpen);
		this._quickInputService = quickInputService;
	}

	public dispose(): void {
	}

	$show(instAnce: number, options: IPickOptions<TrAnsferQuickPickItems>, token: CAncellAtionToken): Promise<number | number[] | undefined> {
		const contents = new Promise<TrAnsferQuickPickItems[]>((resolve, reject) => {
			this._items[instAnce] = { resolve, reject };
		});

		options = {
			...options,
			onDidFocus: el => {
				if (el) {
					this._proxy.$onItemSelected((<TrAnsferQuickPickItems>el).hAndle);
				}
			}
		};

		if (options.cAnPickMAny) {
			return this._quickInputService.pick(contents, options As { cAnPickMAny: true }, token).then(items => {
				if (items) {
					return items.mAp(item => item.hAndle);
				}
				return undefined;
			});
		} else {
			return this._quickInputService.pick(contents, options, token).then(item => {
				if (item) {
					return item.hAndle;
				}
				return undefined;
			});
		}
	}

	$setItems(instAnce: number, items: TrAnsferQuickPickItems[]): Promise<void> {
		if (this._items[instAnce]) {
			this._items[instAnce].resolve(items);
			delete this._items[instAnce];
		}
		return Promise.resolve();
	}

	$setError(instAnce: number, error: Error): Promise<void> {
		if (this._items[instAnce]) {
			this._items[instAnce].reject(error);
			delete this._items[instAnce];
		}
		return Promise.resolve();
	}

	// ---- input

	$input(options: IInputBoxOptions | undefined, vAlidAteInput: booleAn, token: CAncellAtionToken): Promise<string | undefined> {
		const inputOptions: IInputOptions = Object.creAte(null);

		if (options) {
			inputOptions.pAssword = options.pAssword;
			inputOptions.plAceHolder = options.plAceHolder;
			inputOptions.vAlueSelection = options.vAlueSelection;
			inputOptions.prompt = options.prompt;
			inputOptions.vAlue = options.vAlue;
			inputOptions.ignoreFocusLost = options.ignoreFocusOut;
		}

		if (vAlidAteInput) {
			inputOptions.vAlidAteInput = (vAlue) => {
				return this._proxy.$vAlidAteInput(vAlue);
			};
		}

		return this._quickInputService.input(inputOptions, token);
	}

	// ---- QuickInput

	privAte sessions = new MAp<number, QuickInputSession>();

	$creAteOrUpdAte(pArAms: TrAnsferQuickInput): Promise<void> {
		const sessionId = pArAms.id;
		let session = this.sessions.get(sessionId);
		if (!session) {
			if (pArAms.type === 'quickPick') {
				const input = this._quickInputService.creAteQuickPick();
				input.onDidAccept(() => {
					this._proxy.$onDidAccept(sessionId);
				});
				input.onDidChAngeActive(items => {
					this._proxy.$onDidChAngeActive(sessionId, items.mAp(item => (item As TrAnsferQuickPickItems).hAndle));
				});
				input.onDidChAngeSelection(items => {
					this._proxy.$onDidChAngeSelection(sessionId, items.mAp(item => (item As TrAnsferQuickPickItems).hAndle));
				});
				input.onDidTriggerButton(button => {
					this._proxy.$onDidTriggerButton(sessionId, (button As TrAnsferQuickInputButton).hAndle);
				});
				input.onDidChAngeVAlue(vAlue => {
					this._proxy.$onDidChAngeVAlue(sessionId, vAlue);
				});
				input.onDidHide(() => {
					this._proxy.$onDidHide(sessionId);
				});
				session = {
					input,
					hAndlesToItems: new MAp()
				};
			} else {
				const input = this._quickInputService.creAteInputBox();
				input.onDidAccept(() => {
					this._proxy.$onDidAccept(sessionId);
				});
				input.onDidTriggerButton(button => {
					this._proxy.$onDidTriggerButton(sessionId, (button As TrAnsferQuickInputButton).hAndle);
				});
				input.onDidChAngeVAlue(vAlue => {
					this._proxy.$onDidChAngeVAlue(sessionId, vAlue);
				});
				input.onDidHide(() => {
					this._proxy.$onDidHide(sessionId);
				});
				session = {
					input,
					hAndlesToItems: new MAp()
				};
			}
			this.sessions.set(sessionId, session);
		}
		const { input, hAndlesToItems } = session;
		for (const pArAm in pArAms) {
			if (pArAm === 'id' || pArAm === 'type') {
				continue;
			}
			if (pArAm === 'visible') {
				if (pArAms.visible) {
					input.show();
				} else {
					input.hide();
				}
			} else if (pArAm === 'items') {
				hAndlesToItems.cleAr();
				pArAms[pArAm].forEAch((item: TrAnsferQuickPickItems) => {
					hAndlesToItems.set(item.hAndle, item);
				});
				(input As Any)[pArAm] = pArAms[pArAm];
			} else if (pArAm === 'ActiveItems' || pArAm === 'selectedItems') {
				(input As Any)[pArAm] = pArAms[pArAm]
					.filter((hAndle: number) => hAndlesToItems.hAs(hAndle))
					.mAp((hAndle: number) => hAndlesToItems.get(hAndle));
			} else if (pArAm === 'buttons') {
				(input As Any)[pArAm] = pArAms.buttons!.mAp(button => {
					if (button.hAndle === -1) {
						return this._quickInputService.bAckButton;
					}
					const { iconPAth, tooltip, hAndle } = button;
					if ('id' in iconPAth) {
						return {
							iconClAss: ThemeIcon.AsClAssNAme(iconPAth),
							tooltip,
							hAndle
						};
					} else {
						return {
							iconPAth: {
								dArk: URI.revive(iconPAth.dArk),
								light: iconPAth.light && URI.revive(iconPAth.light)
							},
							tooltip,
							hAndle
						};
					}
				});
			} else {
				(input As Any)[pArAm] = pArAms[pArAm];
			}
		}
		return Promise.resolve(undefined);
	}

	$dispose(sessionId: number): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (session) {
			session.input.dispose();
			this.sessions.delete(sessionId);
		}
		return Promise.resolve(undefined);
	}
}
