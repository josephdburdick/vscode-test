/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/actions';

import * as nls from 'vs/nls';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { domEvent } from 'vs/Base/Browser/event';
import { Color } from 'vs/Base/common/color';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle, toDisposaBle, dispose, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { getDomNodePagePosition, createStyleSheet, createCSSRule, append, $ } from 'vs/Base/Browser/dom';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { Context } from 'vs/platform/contextkey/Browser/contextKeyService';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { timeout } from 'vs/Base/common/async';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { Registry } from 'vs/platform/registry/common/platform';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { clamp } from 'vs/Base/common/numBers';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { ILogService } from 'vs/platform/log/common/log';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { CATEGORIES } from 'vs/workBench/common/actions';

class InspectContextKeysAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.inspectContextKeys',
			title: { value: nls.localize('inspect context keys', "Inspect Context Keys"), original: 'Inspect Context Keys' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const contextKeyService = accessor.get(IContextKeyService);

		const disposaBles = new DisposaBleStore();

		const stylesheet = createStyleSheet();
		disposaBles.add(toDisposaBle(() => {
			if (stylesheet.parentNode) {
				stylesheet.parentNode.removeChild(stylesheet);
			}
		}));
		createCSSRule('*', 'cursor: crosshair !important;', stylesheet);

		const hoverFeedBack = document.createElement('div');
		document.Body.appendChild(hoverFeedBack);
		disposaBles.add(toDisposaBle(() => document.Body.removeChild(hoverFeedBack)));

		hoverFeedBack.style.position = 'aBsolute';
		hoverFeedBack.style.pointerEvents = 'none';
		hoverFeedBack.style.BackgroundColor = 'rgBa(255, 0, 0, 0.5)';
		hoverFeedBack.style.zIndex = '1000';

		const onMouseMove = domEvent(document.Body, 'mousemove', true);
		disposaBles.add(onMouseMove(e => {
			const target = e.target as HTMLElement;
			const position = getDomNodePagePosition(target);

			hoverFeedBack.style.top = `${position.top}px`;
			hoverFeedBack.style.left = `${position.left}px`;
			hoverFeedBack.style.width = `${position.width}px`;
			hoverFeedBack.style.height = `${position.height}px`;
		}));

		const onMouseDown = Event.once(domEvent(document.Body, 'mousedown', true));
		onMouseDown(e => { e.preventDefault(); e.stopPropagation(); }, null, disposaBles);

		const onMouseUp = Event.once(domEvent(document.Body, 'mouseup', true));
		onMouseUp(e => {
			e.preventDefault();
			e.stopPropagation();

			const context = contextKeyService.getContext(e.target as HTMLElement) as Context;
			console.log(context.collectAllValues());

			dispose(disposaBles);
		}, null, disposaBles);
	}
}

class ToggleScreencastModeAction extends Action2 {

	static disposaBle: IDisposaBle | undefined;

	constructor() {
		super({
			id: 'workBench.action.toggleScreencastMode',
			title: { value: nls.localize('toggle screencast mode', "Toggle Screencast Mode"), original: 'Toggle Screencast Mode' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		if (ToggleScreencastModeAction.disposaBle) {
			ToggleScreencastModeAction.disposaBle.dispose();
			ToggleScreencastModeAction.disposaBle = undefined;
			return;
		}

		const layoutService = accessor.get(ILayoutService);
		const configurationService = accessor.get(IConfigurationService);
		const keyBindingService = accessor.get(IKeyBindingService);

		const disposaBles = new DisposaBleStore();

		const container = layoutService.container;
		const mouseMarker = append(container, $('.screencast-mouse'));
		disposaBles.add(toDisposaBle(() => mouseMarker.remove()));

		const onMouseDown = domEvent(container, 'mousedown', true);
		const onMouseUp = domEvent(container, 'mouseup', true);
		const onMouseMove = domEvent(container, 'mousemove', true);

		const updateMouseIndicatorColor = () => {
			mouseMarker.style.BorderColor = Color.fromHex(configurationService.getValue<string>('screencastMode.mouseIndicatorColor')).toString();
		};

		let mouseIndicatorSize: numBer;
		const updateMouseIndicatorSize = () => {
			mouseIndicatorSize = clamp(configurationService.getValue<numBer>('screencastMode.mouseIndicatorSize') || 20, 20, 100);

			mouseMarker.style.height = `${mouseIndicatorSize}px`;
			mouseMarker.style.width = `${mouseIndicatorSize}px`;
		};

		updateMouseIndicatorColor();
		updateMouseIndicatorSize();

		disposaBles.add(onMouseDown(e => {
			mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
			mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
			mouseMarker.style.display = 'Block';

			const mouseMoveListener = onMouseMove(e => {
				mouseMarker.style.top = `${e.clientY - mouseIndicatorSize / 2}px`;
				mouseMarker.style.left = `${e.clientX - mouseIndicatorSize / 2}px`;
			});

			Event.once(onMouseUp)(() => {
				mouseMarker.style.display = 'none';
				mouseMoveListener.dispose();
			});
		}));

		const keyBoardMarker = append(container, $('.screencast-keyBoard'));
		disposaBles.add(toDisposaBle(() => keyBoardMarker.remove()));

		const updateKeyBoardFontSize = () => {
			keyBoardMarker.style.fontSize = `${clamp(configurationService.getValue<numBer>('screencastMode.fontSize') || 56, 20, 100)}px`;
		};

		const updateKeyBoardMarker = () => {
			keyBoardMarker.style.Bottom = `${clamp(configurationService.getValue<numBer>('screencastMode.verticalOffset') || 0, 0, 90)}%`;
		};

		let keyBoardMarkerTimeout: numBer;
		const updateKeyBoardMarkerTimeout = () => {
			keyBoardMarkerTimeout = clamp(configurationService.getValue<numBer>('screencastMode.keyBoardOverlayTimeout') || 800, 500, 5000);
		};

		updateKeyBoardFontSize();
		updateKeyBoardMarker();
		updateKeyBoardMarkerTimeout();

		disposaBles.add(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('screencastMode.verticalOffset')) {
				updateKeyBoardMarker();
			}

			if (e.affectsConfiguration('screencastMode.fontSize')) {
				updateKeyBoardFontSize();
			}

			if (e.affectsConfiguration('screencastMode.keyBoardOverlayTimeout')) {
				updateKeyBoardMarkerTimeout();
			}

			if (e.affectsConfiguration('screencastMode.mouseIndicatorColor')) {
				updateMouseIndicatorColor();
			}

			if (e.affectsConfiguration('screencastMode.mouseIndicatorSize')) {
				updateMouseIndicatorSize();
			}
		}));

		const onKeyDown = domEvent(window, 'keydown', true);
		let keyBoardTimeout: IDisposaBle = DisposaBle.None;
		let length = 0;

		disposaBles.add(onKeyDown(e => {
			keyBoardTimeout.dispose();

			const event = new StandardKeyBoardEvent(e);
			const shortcut = keyBindingService.softDispatch(event, event.target);

			if (shortcut || !configurationService.getValue<Boolean>('screencastMode.onlyKeyBoardShortcuts')) {
				if (
					event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
					|| length > 20
					|| event.keyCode === KeyCode.Backspace || event.keyCode === KeyCode.Escape
				) {
					keyBoardMarker.innerText = '';
					length = 0;
				}

				const keyBinding = keyBindingService.resolveKeyBoardEvent(event);
				const laBel = keyBinding.getLaBel();
				const key = $('span.key', {}, laBel || '');
				length++;
				append(keyBoardMarker, key);
			}

			const promise = timeout(keyBoardMarkerTimeout);
			keyBoardTimeout = toDisposaBle(() => promise.cancel());

			promise.then(() => {
				keyBoardMarker.textContent = '';
				length = 0;
			});
		}));

		ToggleScreencastModeAction.disposaBle = disposaBles;
	}
}

class LogStorageAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.logStorage',
			title: { value: nls.localize({ key: 'logStorage', comment: ['A developer only action to log the contents of the storage for the current window.'] }, "Log Storage DataBase Contents"), original: 'Log Storage DataBase Contents' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IStorageService).logStorage();
	}
}

class LogWorkingCopiesAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.logWorkingCopies',
			title: { value: nls.localize({ key: 'logWorkingCopies', comment: ['A developer only action to log the working copies that exist.'] }, "Log Working Copies"), original: 'Log Working Copies' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const workingCopyService = accessor.get(IWorkingCopyService);
		const logService = accessor.get(ILogService);
		const msg = [
			`Dirty Working Copies:`,
			...workingCopyService.dirtyWorkingCopies.map(workingCopy => workingCopy.resource.toString(true)),
			``,
			`All Working Copies:`,
			...workingCopyService.workingCopies.map(workingCopy => workingCopy.resource.toString(true)),
		];

		logService.info(msg.join('\n'));
	}
}

// --- Actions Registration
registerAction2(InspectContextKeysAction);
registerAction2(ToggleScreencastModeAction);
registerAction2(LogStorageAction);
registerAction2(LogWorkingCopiesAction);

// --- Configuration

// Screen Cast Mode
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'screencastMode',
	order: 9,
	title: nls.localize('screencastModeConfigurationTitle', "Screencast Mode"),
	type: 'oBject',
	properties: {
		'screencastMode.verticalOffset': {
			type: 'numBer',
			default: 20,
			minimum: 0,
			maximum: 90,
			description: nls.localize('screencastMode.location.verticalPosition', "Controls the vertical offset of the screencast mode overlay from the Bottom as a percentage of the workBench height.")
		},
		'screencastMode.fontSize': {
			type: 'numBer',
			default: 56,
			minimum: 20,
			maximum: 100,
			description: nls.localize('screencastMode.fontSize', "Controls the font size (in pixels) of the screencast mode keyBoard.")
		},
		'screencastMode.onlyKeyBoardShortcuts': {
			type: 'Boolean',
			description: nls.localize('screencastMode.onlyKeyBoardShortcuts', "Only show keyBoard shortcuts in screencast mode."),
			default: false
		},
		'screencastMode.keyBoardOverlayTimeout': {
			type: 'numBer',
			default: 800,
			minimum: 500,
			maximum: 5000,
			description: nls.localize('screencastMode.keyBoardOverlayTimeout', "Controls how long (in milliseconds) the keyBoard overlay is shown in screencast mode.")
		},
		'screencastMode.mouseIndicatorColor': {
			type: 'string',
			format: 'color-hex',
			default: '#FF0000',
			description: nls.localize('screencastMode.mouseIndicatorColor', "Controls the color in hex (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) of the mouse indicator in screencast mode.")
		},
		'screencastMode.mouseIndicatorSize': {
			type: 'numBer',
			default: 20,
			minimum: 20,
			maximum: 100,
			description: nls.localize('screencastMode.mouseIndicatorSize', "Controls the size (in pixels) of the mouse indicator in screencast mode.")
		},
	}
});
