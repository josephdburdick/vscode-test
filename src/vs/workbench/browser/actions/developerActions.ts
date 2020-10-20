/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/Actions';

import * As nls from 'vs/nls';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { domEvent } from 'vs/bAse/browser/event';
import { Color } from 'vs/bAse/common/color';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble, toDisposAble, dispose, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { getDomNodePAgePosition, creAteStyleSheet, creAteCSSRule, Append, $ } from 'vs/bAse/browser/dom';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { Context } from 'vs/plAtform/contextkey/browser/contextKeyService';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { timeout } from 'vs/bAse/common/Async';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { clAmp } from 'vs/bAse/common/numbers';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CATEGORIES } from 'vs/workbench/common/Actions';

clAss InspectContextKeysAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.inspectContextKeys',
			title: { vAlue: nls.locAlize('inspect context keys', "Inspect Context Keys"), originAl: 'Inspect Context Keys' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		const contextKeyService = Accessor.get(IContextKeyService);

		const disposAbles = new DisposAbleStore();

		const stylesheet = creAteStyleSheet();
		disposAbles.Add(toDisposAble(() => {
			if (stylesheet.pArentNode) {
				stylesheet.pArentNode.removeChild(stylesheet);
			}
		}));
		creAteCSSRule('*', 'cursor: crosshAir !importAnt;', stylesheet);

		const hoverFeedbAck = document.creAteElement('div');
		document.body.AppendChild(hoverFeedbAck);
		disposAbles.Add(toDisposAble(() => document.body.removeChild(hoverFeedbAck)));

		hoverFeedbAck.style.position = 'Absolute';
		hoverFeedbAck.style.pointerEvents = 'none';
		hoverFeedbAck.style.bAckgroundColor = 'rgbA(255, 0, 0, 0.5)';
		hoverFeedbAck.style.zIndex = '1000';

		const onMouseMove = domEvent(document.body, 'mousemove', true);
		disposAbles.Add(onMouseMove(e => {
			const tArget = e.tArget As HTMLElement;
			const position = getDomNodePAgePosition(tArget);

			hoverFeedbAck.style.top = `${position.top}px`;
			hoverFeedbAck.style.left = `${position.left}px`;
			hoverFeedbAck.style.width = `${position.width}px`;
			hoverFeedbAck.style.height = `${position.height}px`;
		}));

		const onMouseDown = Event.once(domEvent(document.body, 'mousedown', true));
		onMouseDown(e => { e.preventDefAult(); e.stopPropAgAtion(); }, null, disposAbles);

		const onMouseUp = Event.once(domEvent(document.body, 'mouseup', true));
		onMouseUp(e => {
			e.preventDefAult();
			e.stopPropAgAtion();

			const context = contextKeyService.getContext(e.tArget As HTMLElement) As Context;
			console.log(context.collectAllVAlues());

			dispose(disposAbles);
		}, null, disposAbles);
	}
}

clAss ToggleScreencAstModeAction extends Action2 {

	stAtic disposAble: IDisposAble | undefined;

	constructor() {
		super({
			id: 'workbench.Action.toggleScreencAstMode',
			title: { vAlue: nls.locAlize('toggle screencAst mode', "Toggle ScreencAst Mode"), originAl: 'Toggle ScreencAst Mode' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		if (ToggleScreencAstModeAction.disposAble) {
			ToggleScreencAstModeAction.disposAble.dispose();
			ToggleScreencAstModeAction.disposAble = undefined;
			return;
		}

		const lAyoutService = Accessor.get(ILAyoutService);
		const configurAtionService = Accessor.get(IConfigurAtionService);
		const keybindingService = Accessor.get(IKeybindingService);

		const disposAbles = new DisposAbleStore();

		const contAiner = lAyoutService.contAiner;
		const mouseMArker = Append(contAiner, $('.screencAst-mouse'));
		disposAbles.Add(toDisposAble(() => mouseMArker.remove()));

		const onMouseDown = domEvent(contAiner, 'mousedown', true);
		const onMouseUp = domEvent(contAiner, 'mouseup', true);
		const onMouseMove = domEvent(contAiner, 'mousemove', true);

		const updAteMouseIndicAtorColor = () => {
			mouseMArker.style.borderColor = Color.fromHex(configurAtionService.getVAlue<string>('screencAstMode.mouseIndicAtorColor')).toString();
		};

		let mouseIndicAtorSize: number;
		const updAteMouseIndicAtorSize = () => {
			mouseIndicAtorSize = clAmp(configurAtionService.getVAlue<number>('screencAstMode.mouseIndicAtorSize') || 20, 20, 100);

			mouseMArker.style.height = `${mouseIndicAtorSize}px`;
			mouseMArker.style.width = `${mouseIndicAtorSize}px`;
		};

		updAteMouseIndicAtorColor();
		updAteMouseIndicAtorSize();

		disposAbles.Add(onMouseDown(e => {
			mouseMArker.style.top = `${e.clientY - mouseIndicAtorSize / 2}px`;
			mouseMArker.style.left = `${e.clientX - mouseIndicAtorSize / 2}px`;
			mouseMArker.style.displAy = 'block';

			const mouseMoveListener = onMouseMove(e => {
				mouseMArker.style.top = `${e.clientY - mouseIndicAtorSize / 2}px`;
				mouseMArker.style.left = `${e.clientX - mouseIndicAtorSize / 2}px`;
			});

			Event.once(onMouseUp)(() => {
				mouseMArker.style.displAy = 'none';
				mouseMoveListener.dispose();
			});
		}));

		const keyboArdMArker = Append(contAiner, $('.screencAst-keyboArd'));
		disposAbles.Add(toDisposAble(() => keyboArdMArker.remove()));

		const updAteKeyboArdFontSize = () => {
			keyboArdMArker.style.fontSize = `${clAmp(configurAtionService.getVAlue<number>('screencAstMode.fontSize') || 56, 20, 100)}px`;
		};

		const updAteKeyboArdMArker = () => {
			keyboArdMArker.style.bottom = `${clAmp(configurAtionService.getVAlue<number>('screencAstMode.verticAlOffset') || 0, 0, 90)}%`;
		};

		let keyboArdMArkerTimeout: number;
		const updAteKeyboArdMArkerTimeout = () => {
			keyboArdMArkerTimeout = clAmp(configurAtionService.getVAlue<number>('screencAstMode.keyboArdOverlAyTimeout') || 800, 500, 5000);
		};

		updAteKeyboArdFontSize();
		updAteKeyboArdMArker();
		updAteKeyboArdMArkerTimeout();

		disposAbles.Add(configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('screencAstMode.verticAlOffset')) {
				updAteKeyboArdMArker();
			}

			if (e.AffectsConfigurAtion('screencAstMode.fontSize')) {
				updAteKeyboArdFontSize();
			}

			if (e.AffectsConfigurAtion('screencAstMode.keyboArdOverlAyTimeout')) {
				updAteKeyboArdMArkerTimeout();
			}

			if (e.AffectsConfigurAtion('screencAstMode.mouseIndicAtorColor')) {
				updAteMouseIndicAtorColor();
			}

			if (e.AffectsConfigurAtion('screencAstMode.mouseIndicAtorSize')) {
				updAteMouseIndicAtorSize();
			}
		}));

		const onKeyDown = domEvent(window, 'keydown', true);
		let keyboArdTimeout: IDisposAble = DisposAble.None;
		let length = 0;

		disposAbles.Add(onKeyDown(e => {
			keyboArdTimeout.dispose();

			const event = new StAndArdKeyboArdEvent(e);
			const shortcut = keybindingService.softDispAtch(event, event.tArget);

			if (shortcut || !configurAtionService.getVAlue<booleAn>('screencAstMode.onlyKeyboArdShortcuts')) {
				if (
					event.ctrlKey || event.AltKey || event.metAKey || event.shiftKey
					|| length > 20
					|| event.keyCode === KeyCode.BAckspAce || event.keyCode === KeyCode.EscApe
				) {
					keyboArdMArker.innerText = '';
					length = 0;
				}

				const keybinding = keybindingService.resolveKeyboArdEvent(event);
				const lAbel = keybinding.getLAbel();
				const key = $('spAn.key', {}, lAbel || '');
				length++;
				Append(keyboArdMArker, key);
			}

			const promise = timeout(keyboArdMArkerTimeout);
			keyboArdTimeout = toDisposAble(() => promise.cAncel());

			promise.then(() => {
				keyboArdMArker.textContent = '';
				length = 0;
			});
		}));

		ToggleScreencAstModeAction.disposAble = disposAbles;
	}
}

clAss LogStorAgeAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.logStorAge',
			title: { vAlue: nls.locAlize({ key: 'logStorAge', comment: ['A developer only Action to log the contents of the storAge for the current window.'] }, "Log StorAge DAtAbAse Contents"), originAl: 'Log StorAge DAtAbAse Contents' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		Accessor.get(IStorAgeService).logStorAge();
	}
}

clAss LogWorkingCopiesAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.logWorkingCopies',
			title: { vAlue: nls.locAlize({ key: 'logWorkingCopies', comment: ['A developer only Action to log the working copies thAt exist.'] }, "Log Working Copies"), originAl: 'Log Working Copies' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		const workingCopyService = Accessor.get(IWorkingCopyService);
		const logService = Accessor.get(ILogService);
		const msg = [
			`Dirty Working Copies:`,
			...workingCopyService.dirtyWorkingCopies.mAp(workingCopy => workingCopy.resource.toString(true)),
			``,
			`All Working Copies:`,
			...workingCopyService.workingCopies.mAp(workingCopy => workingCopy.resource.toString(true)),
		];

		logService.info(msg.join('\n'));
	}
}

// --- Actions RegistrAtion
registerAction2(InspectContextKeysAction);
registerAction2(ToggleScreencAstModeAction);
registerAction2(LogStorAgeAction);
registerAction2(LogWorkingCopiesAction);

// --- ConfigurAtion

// Screen CAst Mode
const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion({
	id: 'screencAstMode',
	order: 9,
	title: nls.locAlize('screencAstModeConfigurAtionTitle', "ScreencAst Mode"),
	type: 'object',
	properties: {
		'screencAstMode.verticAlOffset': {
			type: 'number',
			defAult: 20,
			minimum: 0,
			mAximum: 90,
			description: nls.locAlize('screencAstMode.locAtion.verticAlPosition', "Controls the verticAl offset of the screencAst mode overlAy from the bottom As A percentAge of the workbench height.")
		},
		'screencAstMode.fontSize': {
			type: 'number',
			defAult: 56,
			minimum: 20,
			mAximum: 100,
			description: nls.locAlize('screencAstMode.fontSize', "Controls the font size (in pixels) of the screencAst mode keyboArd.")
		},
		'screencAstMode.onlyKeyboArdShortcuts': {
			type: 'booleAn',
			description: nls.locAlize('screencAstMode.onlyKeyboArdShortcuts', "Only show keyboArd shortcuts in screencAst mode."),
			defAult: fAlse
		},
		'screencAstMode.keyboArdOverlAyTimeout': {
			type: 'number',
			defAult: 800,
			minimum: 500,
			mAximum: 5000,
			description: nls.locAlize('screencAstMode.keyboArdOverlAyTimeout', "Controls how long (in milliseconds) the keyboArd overlAy is shown in screencAst mode.")
		},
		'screencAstMode.mouseIndicAtorColor': {
			type: 'string',
			formAt: 'color-hex',
			defAult: '#FF0000',
			description: nls.locAlize('screencAstMode.mouseIndicAtorColor', "Controls the color in hex (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) of the mouse indicAtor in screencAst mode.")
		},
		'screencAstMode.mouseIndicAtorSize': {
			type: 'number',
			defAult: 20,
			minimum: 20,
			mAximum: 100,
			description: nls.locAlize('screencAstMode.mouseIndicAtorSize', "Controls the size (in pixels) of the mouse indicAtor in screencAst mode.")
		},
	}
});
