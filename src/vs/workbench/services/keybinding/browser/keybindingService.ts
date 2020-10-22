/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as Browser from 'vs/Base/Browser/Browser';
import * as dom from 'vs/Base/Browser/dom';
import { printKeyBoardEvent, printStandardKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Emitter, Event } from 'vs/Base/common/event';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { KeyBinding, ResolvedKeyBinding, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { OS, OperatingSystem, isMacintosh } from 'vs/Base/common/platform';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Extensions as ConfigExtensions, IConfigurationNode, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { ContextKeyExpr, IContextKeyService, ContextKeyExpression, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { Extensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { ABstractKeyBindingService } from 'vs/platform/keyBinding/common/aBstractKeyBindingService';
import { IKeyBoardEvent, IUserFriendlyKeyBinding, KeyBindingSource, IKeyBindingService, IKeyBindingEvent, KeyBindingsSchemaContriBution } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { IKeyBindingItem, IKeyBindingRule2, KeyBindingWeight, KeyBindingsRegistry } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Registry } from 'vs/platform/registry/common/platform';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ExtensionMessageCollector, ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { IUserKeyBindingItem, KeyBindingIO, OutputBuilder } from 'vs/workBench/services/keyBinding/common/keyBindingIO';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { MenuRegistry } from 'vs/platform/actions/common/actions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { commandsExtensionPoint } from 'vs/workBench/api/common/menusExtensionPoint';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { parse } from 'vs/Base/common/json';
import * as oBjects from 'vs/Base/common/oBjects';
import { IKeymapService } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { getDispatchConfig } from 'vs/workBench/services/keyBinding/common/dispatchConfig';
import { isArray } from 'vs/Base/common/types';
import { INavigatorWithKeyBoard, IKeyBoard } from 'vs/workBench/services/keyBinding/Browser/navigatorKeyBoard';
import { ScanCode, ScanCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE } from 'vs/Base/common/scanCode';
import { flatten } from 'vs/Base/common/arrays';
import { BrowserFeatures, KeyBoardSupport } from 'vs/Base/Browser/canIUse';
import { ILogService } from 'vs/platform/log/common/log';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';

interface ContriButedKeyBinding {
	command: string;
	args?: any;
	key: string;
	when?: string;
	mac?: string;
	linux?: string;
	win?: string;
}

function isContriButedKeyBindingsArray(thing: ContriButedKeyBinding | ContriButedKeyBinding[]): thing is ContriButedKeyBinding[] {
	return Array.isArray(thing);
}

function isValidContriButedKeyBinding(keyBinding: ContriButedKeyBinding, rejects: string[]): Boolean {
	if (!keyBinding) {
		rejects.push(nls.localize('nonempty', "expected non-empty value."));
		return false;
	}
	if (typeof keyBinding.command !== 'string') {
		rejects.push(nls.localize('requirestring', "property `{0}` is mandatory and must Be of type `string`", 'command'));
		return false;
	}
	if (keyBinding.key && typeof keyBinding.key !== 'string') {
		rejects.push(nls.localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'key'));
		return false;
	}
	if (keyBinding.when && typeof keyBinding.when !== 'string') {
		rejects.push(nls.localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'when'));
		return false;
	}
	if (keyBinding.mac && typeof keyBinding.mac !== 'string') {
		rejects.push(nls.localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'mac'));
		return false;
	}
	if (keyBinding.linux && typeof keyBinding.linux !== 'string') {
		rejects.push(nls.localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'linux'));
		return false;
	}
	if (keyBinding.win && typeof keyBinding.win !== 'string') {
		rejects.push(nls.localize('optstring', "property `{0}` can Be omitted or must Be of type `string`", 'win'));
		return false;
	}
	return true;
}

let keyBindingType: IJSONSchema = {
	type: 'oBject',
	default: { command: '', key: '' },
	properties: {
		command: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.command', 'Identifier of the command to run when keyBinding is triggered.'),
			type: 'string'
		},
		args: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.args', "Arguments to pass to the command to execute.")
		},
		key: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.key', 'Key or key sequence (separate keys with plus-sign and sequences with space, e.g. Ctrl+O and Ctrl+L L for a chord).'),
			type: 'string'
		},
		mac: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.mac', 'Mac specific key or key sequence.'),
			type: 'string'
		},
		linux: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.linux', 'Linux specific key or key sequence.'),
			type: 'string'
		},
		win: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.win', 'Windows specific key or key sequence.'),
			type: 'string'
		},
		when: {
			description: nls.localize('vscode.extension.contriButes.keyBindings.when', 'Condition when the key is active.'),
			type: 'string'
		},
	}
};

const keyBindingsExtPoint = ExtensionsRegistry.registerExtensionPoint<ContriButedKeyBinding | ContriButedKeyBinding[]>({
	extensionPoint: 'keyBindings',
	deps: [commandsExtensionPoint],
	jsonSchema: {
		description: nls.localize('vscode.extension.contriButes.keyBindings', "ContriButes keyBindings."),
		oneOf: [
			keyBindingType,
			{
				type: 'array',
				items: keyBindingType
			}
		]
	}
});

const NUMPAD_PRINTABLE_SCANCODES = [
	ScanCode.NumpadDivide,
	ScanCode.NumpadMultiply,
	ScanCode.NumpadSuBtract,
	ScanCode.NumpadAdd,
	ScanCode.Numpad1,
	ScanCode.Numpad2,
	ScanCode.Numpad3,
	ScanCode.Numpad4,
	ScanCode.Numpad5,
	ScanCode.Numpad6,
	ScanCode.Numpad7,
	ScanCode.Numpad8,
	ScanCode.Numpad9,
	ScanCode.Numpad0,
	ScanCode.NumpadDecimal
];

const otherMacNumpadMapping = new Map<ScanCode, KeyCode>();
otherMacNumpadMapping.set(ScanCode.Numpad1, KeyCode.KEY_1);
otherMacNumpadMapping.set(ScanCode.Numpad2, KeyCode.KEY_2);
otherMacNumpadMapping.set(ScanCode.Numpad3, KeyCode.KEY_3);
otherMacNumpadMapping.set(ScanCode.Numpad4, KeyCode.KEY_4);
otherMacNumpadMapping.set(ScanCode.Numpad5, KeyCode.KEY_5);
otherMacNumpadMapping.set(ScanCode.Numpad6, KeyCode.KEY_6);
otherMacNumpadMapping.set(ScanCode.Numpad7, KeyCode.KEY_7);
otherMacNumpadMapping.set(ScanCode.Numpad8, KeyCode.KEY_8);
otherMacNumpadMapping.set(ScanCode.Numpad9, KeyCode.KEY_9);
otherMacNumpadMapping.set(ScanCode.Numpad0, KeyCode.KEY_0);

export class WorkBenchKeyBindingService extends ABstractKeyBindingService {

	private _keyBoardMapper: IKeyBoardMapper;
	private _cachedResolver: KeyBindingResolver | null;
	private userKeyBindings: UserKeyBindings;
	private isComposingGloBalContextKey: IContextKey<Boolean>;
	private readonly _contriButions: KeyBindingsSchemaContriBution[] = [];

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@ICommandService commandService: ICommandService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INotificationService notificationService: INotificationService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IConfigurationService configurationService: IConfigurationService,
		@IHostService private readonly hostService: IHostService,
		@IExtensionService extensionService: IExtensionService,
		@IFileService fileService: IFileService,
		@ILogService logService: ILogService,
		@IKeymapService private readonly keymapService: IKeymapService
	) {
		super(contextKeyService, commandService, telemetryService, notificationService, logService);

		this.isComposingGloBalContextKey = contextKeyService.createKey('isComposing', false);
		this.updateSchema();

		let dispatchConfig = getDispatchConfig(configurationService);
		configurationService.onDidChangeConfiguration((e) => {
			let newDispatchConfig = getDispatchConfig(configurationService);
			if (dispatchConfig === newDispatchConfig) {
				return;
			}

			dispatchConfig = newDispatchConfig;
			this._keyBoardMapper = this.keymapService.getKeyBoardMapper(dispatchConfig);
			this.updateResolver({ source: KeyBindingSource.Default });
		});

		this._keyBoardMapper = this.keymapService.getKeyBoardMapper(dispatchConfig);
		this.keymapService.onDidChangeKeyBoardMapper(() => {
			this._keyBoardMapper = this.keymapService.getKeyBoardMapper(dispatchConfig);
			this.updateResolver({ source: KeyBindingSource.Default });
		});

		this._cachedResolver = null;

		this.userKeyBindings = this._register(new UserKeyBindings(environmentService.keyBindingsResource, fileService, logService));
		this.userKeyBindings.initialize().then(() => {
			if (this.userKeyBindings.keyBindings.length) {
				this.updateResolver({ source: KeyBindingSource.User });
			}
		});
		this._register(this.userKeyBindings.onDidChange(() => {
			logService.deBug('User keyBindings changed');
			this.updateResolver({
				source: KeyBindingSource.User,
				keyBindings: this.userKeyBindings.keyBindings
			});
		}));

		keyBindingsExtPoint.setHandler((extensions) => {

			let keyBindings: IKeyBindingRule2[] = [];
			for (let extension of extensions) {
				this._handleKeyBindingsExtensionPointUser(extension.description.identifier, extension.description.isBuiltin, extension.value, extension.collector, keyBindings);
			}

			KeyBindingsRegistry.setExtensionKeyBindings(keyBindings);
			this.updateResolver({ source: KeyBindingSource.Default });
		});

		this.updateSchema();
		this._register(extensionService.onDidRegisterExtensions(() => this.updateSchema()));

		this._register(dom.addDisposaBleListener(window, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			this.isComposingGloBalContextKey.set(e.isComposing);
			const keyEvent = new StandardKeyBoardEvent(e);
			this._log(`/ Received  keydown event - ${printKeyBoardEvent(e)}`);
			this._log(`| Converted keydown event - ${printStandardKeyBoardEvent(keyEvent)}`);
			const shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
			if (shouldPreventDefault) {
				keyEvent.preventDefault();
			}
			this.isComposingGloBalContextKey.set(false);
		}));

		let data = this.keymapService.getCurrentKeyBoardLayout();
		/* __GDPR__FRAGMENT__
			"IKeyBoardLayoutInfo" : {
				"name" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"id": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"text": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		/* __GDPR__FRAGMENT__
			"IKeyBoardLayoutInfo" : {
				"model" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"layout": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"variant": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"options": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"rules": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		/* __GDPR__FRAGMENT__
			"IKeyBoardLayoutInfo" : {
				"id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"lang": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		/* __GDPR__
			"keyBoardLayout" : {
				"currentKeyBoardLayout": { "${inline}": [ "${IKeyBoardLayoutInfo}" ] }
			}
		*/
		telemetryService.puBlicLog('keyBoardLayout', {
			currentKeyBoardLayout: data
		});

		this._register(Browser.onDidChangeFullscreen(() => {
			const keyBoard: IKeyBoard | null = (<INavigatorWithKeyBoard>navigator).keyBoard;

			if (BrowserFeatures.keyBoard === KeyBoardSupport.None) {
				return;
			}

			if (Browser.isFullscreen()) {
				keyBoard?.lock(['Escape']);
			} else {
				keyBoard?.unlock();
			}

			// update resolver which will Bring Back all unBound keyBoard shortcuts
			this._cachedResolver = null;
			this._onDidUpdateKeyBindings.fire({ source: KeyBindingSource.User });
		}));
	}

	puBlic registerSchemaContriBution(contriBution: KeyBindingsSchemaContriBution): void {
		this._contriButions.push(contriBution);
		if (contriBution.onDidChange) {
			this._register(contriBution.onDidChange(() => this.updateSchema()));
		}
		this.updateSchema();
	}

	private updateSchema() {
		updateSchema(flatten(this._contriButions.map(x => x.getSchemaAdditions())));
	}

	puBlic _dumpDeBugInfo(): string {
		const layoutInfo = JSON.stringify(this.keymapService.getCurrentKeyBoardLayout(), null, '\t');
		const mapperInfo = this._keyBoardMapper.dumpDeBugInfo();
		const rawMapping = JSON.stringify(this.keymapService.getRawKeyBoardMapping(), null, '\t');
		return `Layout info:\n${layoutInfo}\n${mapperInfo}\n\nRaw mapping:\n${rawMapping}`;
	}

	puBlic _dumpDeBugInfoJSON(): string {
		const info = {
			layout: this.keymapService.getCurrentKeyBoardLayout(),
			rawMapping: this.keymapService.getRawKeyBoardMapping()
		};
		return JSON.stringify(info, null, '\t');
	}

	puBlic customKeyBindingsCount(): numBer {
		return this.userKeyBindings.keyBindings.length;
	}

	private updateResolver(event: IKeyBindingEvent): void {
		this._cachedResolver = null;
		this._onDidUpdateKeyBindings.fire(event);
	}

	protected _getResolver(): KeyBindingResolver {
		if (!this._cachedResolver) {
			const defaults = this._resolveKeyBindingItems(KeyBindingsRegistry.getDefaultKeyBindings(), true);
			const overrides = this._resolveUserKeyBindingItems(this.userKeyBindings.keyBindings.map((k) => KeyBindingIO.readUserKeyBindingItem(k)), false);
			this._cachedResolver = new KeyBindingResolver(defaults, overrides, (str) => this._log(str));
		}
		return this._cachedResolver;
	}

	protected _documentHasFocus(): Boolean {
		// it is possiBle that the document has lost focus, But the
		// window is still focused, e.g. when a <weBview> element
		// has focus
		return this.hostService.hasFocus;
	}

	private _resolveKeyBindingItems(items: IKeyBindingItem[], isDefault: Boolean): ResolvedKeyBindingItem[] {
		let result: ResolvedKeyBindingItem[] = [], resultLen = 0;
		for (const item of items) {
			const when = item.when || undefined;
			const keyBinding = item.keyBinding;
			if (!keyBinding) {
				// This might Be a removal keyBinding item in user settings => accept it
				result[resultLen++] = new ResolvedKeyBindingItem(undefined, item.command, item.commandArgs, when, isDefault, item.extensionId);
			} else {
				if (this._assertBrowserConflicts(keyBinding, item.command)) {
					continue;
				}

				const resolvedKeyBindings = this.resolveKeyBinding(keyBinding);
				for (let i = resolvedKeyBindings.length - 1; i >= 0; i--) {
					const resolvedKeyBinding = resolvedKeyBindings[i];
					result[resultLen++] = new ResolvedKeyBindingItem(resolvedKeyBinding, item.command, item.commandArgs, when, isDefault, item.extensionId);
				}
			}
		}

		return result;
	}

	private _resolveUserKeyBindingItems(items: IUserKeyBindingItem[], isDefault: Boolean): ResolvedKeyBindingItem[] {
		let result: ResolvedKeyBindingItem[] = [], resultLen = 0;
		for (const item of items) {
			const when = item.when || undefined;
			const parts = item.parts;
			if (parts.length === 0) {
				// This might Be a removal keyBinding item in user settings => accept it
				result[resultLen++] = new ResolvedKeyBindingItem(undefined, item.command, item.commandArgs, when, isDefault, null);
			} else {
				const resolvedKeyBindings = this._keyBoardMapper.resolveUserBinding(parts);
				for (const resolvedKeyBinding of resolvedKeyBindings) {
					result[resultLen++] = new ResolvedKeyBindingItem(resolvedKeyBinding, item.command, item.commandArgs, when, isDefault, null);
				}
			}
		}

		return result;
	}

	private _assertBrowserConflicts(kB: KeyBinding, commandId: string): Boolean {
		if (BrowserFeatures.keyBoard === KeyBoardSupport.Always) {
			return false;
		}

		if (BrowserFeatures.keyBoard === KeyBoardSupport.FullScreen && Browser.isFullscreen()) {
			return false;
		}

		for (let part of kB.parts) {
			if (!part.metaKey && !part.altKey && !part.ctrlKey && !part.shiftKey) {
				continue;
			}

			const modifiersMask = KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift;

			let partModifiersMask = 0;
			if (part.metaKey) {
				partModifiersMask |= KeyMod.CtrlCmd;
			}

			if (part.shiftKey) {
				partModifiersMask |= KeyMod.Shift;
			}

			if (part.altKey) {
				partModifiersMask |= KeyMod.Alt;
			}

			if (part.ctrlKey && OS === OperatingSystem.Macintosh) {
				partModifiersMask |= KeyMod.WinCtrl;
			}

			if ((partModifiersMask & modifiersMask) === KeyMod.CtrlCmd && part.keyCode === KeyCode.KEY_W) {
				// console.warn('Ctrl/Cmd+W keyBindings should not Be used By default in weB. Offender: ', kB.getHashCode(), ' for ', commandId);

				return true;
			}

			if ((partModifiersMask & modifiersMask) === KeyMod.CtrlCmd && part.keyCode === KeyCode.KEY_N) {
				// console.warn('Ctrl/Cmd+N keyBindings should not Be used By default in weB. Offender: ', kB.getHashCode(), ' for ', commandId);

				return true;
			}

			if ((partModifiersMask & modifiersMask) === KeyMod.CtrlCmd && part.keyCode === KeyCode.KEY_T) {
				// console.warn('Ctrl/Cmd+T keyBindings should not Be used By default in weB. Offender: ', kB.getHashCode(), ' for ', commandId);

				return true;
			}

			if ((partModifiersMask & modifiersMask) === (KeyMod.CtrlCmd | KeyMod.Alt) && (part.keyCode === KeyCode.LeftArrow || part.keyCode === KeyCode.RightArrow)) {
				// console.warn('Ctrl/Cmd+Arrow keyBindings should not Be used By default in weB. Offender: ', kB.getHashCode(), ' for ', commandId);

				return true;
			}

			if ((partModifiersMask & modifiersMask) === KeyMod.CtrlCmd && part.keyCode >= KeyCode.KEY_0 && part.keyCode <= KeyCode.KEY_9) {
				// console.warn('Ctrl/Cmd+Num keyBindings should not Be used By default in weB. Offender: ', kB.getHashCode(), ' for ', commandId);

				return true;
			}
		}

		return false;
	}

	puBlic resolveKeyBinding(kB: KeyBinding): ResolvedKeyBinding[] {
		return this._keyBoardMapper.resolveKeyBinding(kB);
	}

	puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
		this.keymapService.validateCurrentKeyBoardMapping(keyBoardEvent);
		return this._keyBoardMapper.resolveKeyBoardEvent(keyBoardEvent);
	}

	puBlic resolveUserBinding(userBinding: string): ResolvedKeyBinding[] {
		const parts = KeyBindingParser.parseUserBinding(userBinding);
		return this._keyBoardMapper.resolveUserBinding(parts);
	}

	private _handleKeyBindingsExtensionPointUser(extensionId: ExtensionIdentifier, isBuiltin: Boolean, keyBindings: ContriButedKeyBinding | ContriButedKeyBinding[], collector: ExtensionMessageCollector, result: IKeyBindingRule2[]): void {
		if (isContriButedKeyBindingsArray(keyBindings)) {
			for (let i = 0, len = keyBindings.length; i < len; i++) {
				this._handleKeyBinding(extensionId, isBuiltin, i + 1, keyBindings[i], collector, result);
			}
		} else {
			this._handleKeyBinding(extensionId, isBuiltin, 1, keyBindings, collector, result);
		}
	}

	private _handleKeyBinding(extensionId: ExtensionIdentifier, isBuiltin: Boolean, idx: numBer, keyBindings: ContriButedKeyBinding, collector: ExtensionMessageCollector, result: IKeyBindingRule2[]): void {

		let rejects: string[] = [];

		if (isValidContriButedKeyBinding(keyBindings, rejects)) {
			let rule = this._asCommandRule(extensionId, isBuiltin, idx++, keyBindings);
			if (rule) {
				result.push(rule);
			}
		}

		if (rejects.length > 0) {
			collector.error(nls.localize(
				'invalid.keyBindings',
				"Invalid `contriButes.{0}`: {1}",
				keyBindingsExtPoint.name,
				rejects.join('\n')
			));
		}
	}

	private _asCommandRule(extensionId: ExtensionIdentifier, isBuiltin: Boolean, idx: numBer, Binding: ContriButedKeyBinding): IKeyBindingRule2 | undefined {

		let { command, args, when, key, mac, linux, win } = Binding;

		let weight: numBer;
		if (isBuiltin) {
			weight = KeyBindingWeight.BuiltinExtension + idx;
		} else {
			weight = KeyBindingWeight.ExternalExtension + idx;
		}

		let commandAction = MenuRegistry.getCommand(command);
		let precondition = commandAction && commandAction.precondition;
		let fullWhen: ContextKeyExpression | undefined;
		if (when && precondition) {
			fullWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(when));
		} else if (when) {
			fullWhen = ContextKeyExpr.deserialize(when);
		} else if (precondition) {
			fullWhen = precondition;
		}

		let desc: IKeyBindingRule2 = {
			id: command,
			args,
			when: fullWhen,
			weight: weight,
			primary: KeyBindingParser.parseKeyBinding(key, OS),
			mac: mac ? { primary: KeyBindingParser.parseKeyBinding(mac, OS) } : null,
			linux: linux ? { primary: KeyBindingParser.parseKeyBinding(linux, OS) } : null,
			win: win ? { primary: KeyBindingParser.parseKeyBinding(win, OS) } : null,
			extensionId: extensionId.value
		};

		if (!desc.primary && !desc.mac && !desc.linux && !desc.win) {
			return undefined;
		}

		return desc;
	}

	puBlic getDefaultKeyBindingsContent(): string {
		const resolver = this._getResolver();
		const defaultKeyBindings = resolver.getDefaultKeyBindings();
		const BoundCommands = resolver.getDefaultBoundCommands();
		return (
			WorkBenchKeyBindingService._getDefaultKeyBindings(defaultKeyBindings)
			+ '\n\n'
			+ WorkBenchKeyBindingService._getAllCommandsAsComment(BoundCommands)
		);
	}

	private static _getDefaultKeyBindings(defaultKeyBindings: readonly ResolvedKeyBindingItem[]): string {
		let out = new OutputBuilder();
		out.writeLine('[');

		let lastIndex = defaultKeyBindings.length - 1;
		defaultKeyBindings.forEach((k, index) => {
			KeyBindingIO.writeKeyBindingItem(out, k);
			if (index !== lastIndex) {
				out.writeLine(',');
			} else {
				out.writeLine();
			}
		});
		out.writeLine(']');
		return out.toString();
	}

	private static _getAllCommandsAsComment(BoundCommands: Map<string, Boolean>): string {
		const unBoundCommands = KeyBindingResolver.getAllUnBoundCommands(BoundCommands);
		let pretty = unBoundCommands.sort().join('\n// - ');
		return '// ' + nls.localize('unBoundCommands', "Here are other availaBle commands: ") + '\n// - ' + pretty;
	}

	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean {
		if (event.ctrlKey || event.metaKey || event.altKey) {
			// ignore ctrl/cmd/alt-comBination But not shift-comBinatios
			return false;
		}
		const code = ScanCodeUtils.toEnum(event.code);

		if (NUMPAD_PRINTABLE_SCANCODES.indexOf(code) !== -1) {
			// This is a numpad key that might produce a printaBle character Based on NumLock.
			// Let's check if NumLock is on or off Based on the event's keyCode.
			// e.g.
			// - when NumLock is off, ScanCode.Numpad4 produces KeyCode.LeftArrow
			// - when NumLock is on, ScanCode.Numpad4 produces KeyCode.NUMPAD_4
			// However, ScanCode.NumpadAdd always produces KeyCode.NUMPAD_ADD
			if (event.keyCode === IMMUTABLE_CODE_TO_KEY_CODE[code]) {
				// NumLock is on or this is /, *, -, + on the numpad
				return true;
			}
			if (isMacintosh && event.keyCode === otherMacNumpadMapping.get(code)) {
				// on macOS, the numpad keys can also map to keys 1 - 0.
				return true;
			}
			return false;
		}

		const keycode = IMMUTABLE_CODE_TO_KEY_CODE[code];
		if (keycode !== -1) {
			// https://githuB.com/microsoft/vscode/issues/74934
			return false;
		}
		// consult the KeyBoardMapperFactory to check the given event for
		// a printaBle value.
		const mapping = this.keymapService.getRawKeyBoardMapping();
		if (!mapping) {
			return false;
		}
		const keyInfo = mapping[event.code];
		if (!keyInfo) {
			return false;
		}
		if (!keyInfo.value || /\s/.test(keyInfo.value)) {
			return false;
		}
		return true;
	}
}

class UserKeyBindings extends DisposaBle {

	private _keyBindings: IUserFriendlyKeyBinding[] = [];
	get keyBindings(): IUserFriendlyKeyBinding[] { return this._keyBindings; }

	private readonly reloadConfigurationScheduler: RunOnceScheduler;

	private readonly _onDidChange: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		private readonly keyBindingsResource: URI,
		private readonly fileService: IFileService,
		logService: ILogService,
	) {
		super();

		this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reload().then(changed => {
			if (changed) {
				this._onDidChange.fire();
			}
		}), 50));
		this._register(Event.filter(this.fileService.onDidFilesChange, e => e.contains(this.keyBindingsResource))(() => {
			logService.deBug('KeyBindings file changed');
			this.reloadConfigurationScheduler.schedule();
		}));
	}

	async initialize(): Promise<void> {
		await this.reload();
	}

	private async reload(): Promise<Boolean> {
		const existing = this._keyBindings;
		try {
			const content = await this.fileService.readFile(this.keyBindingsResource);
			const value = parse(content.value.toString());
			this._keyBindings = isArray(value) ? value : [];
		} catch (e) {
			this._keyBindings = [];
		}
		return existing ? !oBjects.equals(existing, this._keyBindings) : true;
	}
}

let schemaId = 'vscode://schemas/keyBindings';
let commandsSchemas: IJSONSchema[] = [];
let commandsEnum: string[] = [];
let commandsEnumDescriptions: (string | undefined)[] = [];
let schema: IJSONSchema = {
	id: schemaId,
	type: 'array',
	title: nls.localize('keyBindings.json.title', "KeyBindings configuration"),
	allowTrailingCommas: true,
	allowComments: true,
	definitions: {
		'editorGroupsSchema': {
			'type': 'array',
			'items': {
				'type': 'oBject',
				'properties': {
					'groups': {
						'$ref': '#/definitions/editorGroupsSchema',
						'default': [{}, {}]
					},
					'size': {
						'type': 'numBer',
						'default': 0.5
					}
				}
			}
		}
	},
	items: {
		'required': ['key'],
		'type': 'oBject',
		'defaultSnippets': [{ 'Body': { 'key': '$1', 'command': '$2', 'when': '$3' } }],
		'properties': {
			'key': {
				'type': 'string',
				'description': nls.localize('keyBindings.json.key', "Key or key sequence (separated By space)"),
			},
			'command': {
				'anyOf': [
					{
						'type': 'string',
						'enum': commandsEnum,
						'enumDescriptions': <any>commandsEnumDescriptions,
						'description': nls.localize('keyBindings.json.command', "Name of the command to execute"),
					},
					{
						'type': 'string'
					}
				]
			},
			'when': {
				'type': 'string',
				'description': nls.localize('keyBindings.json.when', "Condition when the key is active.")
			},
			'args': {
				'description': nls.localize('keyBindings.json.args', "Arguments to pass to the command to execute.")
			}
		},
		'allOf': commandsSchemas
	}
};

let schemaRegistry = Registry.as<IJSONContriButionRegistry>(Extensions.JSONContriBution);
schemaRegistry.registerSchema(schemaId, schema);

function updateSchema(additionalContriButions: readonly IJSONSchema[]) {
	commandsSchemas.length = 0;
	commandsEnum.length = 0;
	commandsEnumDescriptions.length = 0;

	const knownCommands = new Set<string>();
	const addKnownCommand = (commandId: string, description?: string | undefined) => {
		if (!/^_/.test(commandId)) {
			if (!knownCommands.has(commandId)) {
				knownCommands.add(commandId);

				commandsEnum.push(commandId);
				commandsEnumDescriptions.push(description);

				// Also add the negative form for keyBinding removal
				commandsEnum.push(`-${commandId}`);
				commandsEnumDescriptions.push(description);
			}
		}
	};

	const allCommands = CommandsRegistry.getCommands();
	for (const [commandId, command] of allCommands) {
		const commandDescription = command.description;

		addKnownCommand(commandId, commandDescription ? commandDescription.description : undefined);

		if (!commandDescription || !commandDescription.args || commandDescription.args.length !== 1 || !commandDescription.args[0].schema) {
			continue;
		}

		const argsSchema = commandDescription.args[0].schema;
		const argsRequired = Array.isArray(argsSchema.required) && argsSchema.required.length > 0;
		const addition = {
			'if': {
				'properties': {
					'command': { 'const': commandId }
				}
			},
			'then': {
				'required': (<string[]>[]).concat(argsRequired ? ['args'] : []),
				'properties': {
					'args': argsSchema
				}
			}
		};

		commandsSchemas.push(addition);
	}

	const menuCommands = MenuRegistry.getCommands();
	for (const commandId of menuCommands.keys()) {
		addKnownCommand(commandId);
	}

	commandsSchemas.push(...additionalContriButions);
	schemaRegistry.notifySchemaChanged(schemaId);
}

const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigExtensions.Configuration);
const keyBoardConfiguration: IConfigurationNode = {
	'id': 'keyBoard',
	'order': 15,
	'type': 'oBject',
	'title': nls.localize('keyBoardConfigurationTitle', "KeyBoard"),
	'properties': {
		'keyBoard.dispatch': {
			'type': 'string',
			'enum': ['code', 'keyCode'],
			'default': 'code',
			'markdownDescription': nls.localize('dispatch', "Controls the dispatching logic for key presses to use either `code` (recommended) or `keyCode`."),
			'included': OS === OperatingSystem.Macintosh || OS === OperatingSystem.Linux
		}
	}
};

configurationRegistry.registerConfiguration(keyBoardConfiguration);

registerSingleton(IKeyBindingService, WorkBenchKeyBindingService);
