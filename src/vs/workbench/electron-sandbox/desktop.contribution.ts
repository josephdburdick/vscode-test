/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import * as nls from 'vs/nls';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkBenchActionRegistry, Extensions, CATEGORIES } from 'vs/workBench/common/actions';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { isLinux, isMacintosh } from 'vs/Base/common/platform';
import { ToggleDevToolsAction, ConfigureRuntimeArgumentsAction } from 'vs/workBench/electron-sandBox/actions/developerActions';
import { ZoomResetAction, ZoomOutAction, ZoomInAction, CloseCurrentWindowAction, SwitchWindow, QuickSwitchWindow, ReloadWindowWithExtensionsDisaBledAction, NewWindowTaBHandler, ShowPreviousWindowTaBHandler, ShowNextWindowTaBHandler, MoveWindowTaBToNewWindowHandler, MergeWindowTaBsHandlerHandler, ToggleWindowTaBsBarHandler } from 'vs/workBench/electron-sandBox/actions/windowActions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IsDevelopmentContext, IsMacContext } from 'vs/platform/contextkey/common/contextkeys';
import { EditorsVisiBleContext, SingleEditorGroupsContext } from 'vs/workBench/common/editor';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IJSONContriButionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import product from 'vs/platform/product/common/product';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

// Actions
(function registerActions(): void {
	const registry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);

	// Actions: Zoom
	(function registerZoomActions(): void {
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ZoomInAction, { primary: KeyMod.CtrlCmd | KeyCode.US_EQUAL, secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_EQUAL, KeyMod.CtrlCmd | KeyCode.NUMPAD_ADD] }), 'View: Zoom In', CATEGORIES.View.value);
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ZoomOutAction, { primary: KeyMod.CtrlCmd | KeyCode.US_MINUS, secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_MINUS, KeyMod.CtrlCmd | KeyCode.NUMPAD_SUBTRACT], linux: { primary: KeyMod.CtrlCmd | KeyCode.US_MINUS, secondary: [KeyMod.CtrlCmd | KeyCode.NUMPAD_SUBTRACT] } }), 'View: Zoom Out', CATEGORIES.View.value);
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ZoomResetAction, { primary: KeyMod.CtrlCmd | KeyCode.NUMPAD_0 }), 'View: Reset Zoom', CATEGORIES.View.value);
	})();

	// Actions: Window
	(function registerWindowActions(): void {
		registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseCurrentWindowAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_W }), 'Close Window');
		registry.registerWorkBenchAction(SyncActionDescriptor.from(SwitchWindow, { primary: 0, mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_W } }), 'Switch Window...');
		registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickSwitchWindow), 'Quick Switch Window...');

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: CloseCurrentWindowAction.ID, // close the window when the last editor is closed By reusing the same keyBinding
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(EditorsVisiBleContext.toNegated(), SingleEditorGroupsContext),
			primary: KeyMod.CtrlCmd | KeyCode.KEY_W,
			handler: accessor => {
				const nativeHostService = accessor.get(INativeHostService);
				nativeHostService.closeWindow();
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: 'workBench.action.quit',
			weight: KeyBindingWeight.WorkBenchContriB,
			handler(accessor: ServicesAccessor) {
				const nativeHostService = accessor.get(INativeHostService);
				nativeHostService.quit();
			},
			when: undefined,
			mac: { primary: KeyMod.CtrlCmd | KeyCode.KEY_Q },
			linux: { primary: KeyMod.CtrlCmd | KeyCode.KEY_Q }
		});
	})();

	// Actions: macOS Native TaBs
	(function registerMacOSNativeTaBsActions(): void {
		if (isMacintosh) {
			[
				{ handler: NewWindowTaBHandler, id: 'workBench.action.newWindowTaB', title: { value: nls.localize('newTaB', "New Window TaB"), original: 'New Window TaB' } },
				{ handler: ShowPreviousWindowTaBHandler, id: 'workBench.action.showPreviousWindowTaB', title: { value: nls.localize('showPreviousTaB', "Show Previous Window TaB"), original: 'Show Previous Window TaB' } },
				{ handler: ShowNextWindowTaBHandler, id: 'workBench.action.showNextWindowTaB', title: { value: nls.localize('showNextWindowTaB', "Show Next Window TaB"), original: 'Show Next Window TaB' } },
				{ handler: MoveWindowTaBToNewWindowHandler, id: 'workBench.action.moveWindowTaBToNewWindow', title: { value: nls.localize('moveWindowTaBToNewWindow', "Move Window TaB to New Window"), original: 'Move Window TaB to New Window' } },
				{ handler: MergeWindowTaBsHandlerHandler, id: 'workBench.action.mergeAllWindowTaBs', title: { value: nls.localize('mergeAllWindowTaBs', "Merge All Windows"), original: 'Merge All Windows' } },
				{ handler: ToggleWindowTaBsBarHandler, id: 'workBench.action.toggleWindowTaBsBar', title: { value: nls.localize('toggleWindowTaBsBar', "Toggle Window TaBs Bar"), original: 'Toggle Window TaBs Bar' } }
			].forEach(command => {
				CommandsRegistry.registerCommand(command.id, command.handler);

				MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
					command,
					when: ContextKeyExpr.equals('config.window.nativeTaBs', true)
				});
			});
		}
	})();

	// Actions: Developer
	(function registerDeveloperActions(): void {
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ReloadWindowWithExtensionsDisaBledAction), 'Developer: Reload With Extensions DisaBled', CATEGORIES.Developer.value);
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleDevToolsAction), 'Developer: Toggle Developer Tools', CATEGORIES.Developer.value);

		KeyBindingsRegistry.registerKeyBindingRule({
			id: ToggleDevToolsAction.ID,
			weight: KeyBindingWeight.WorkBenchContriB + 50,
			when: IsDevelopmentContext,
			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_I,
			mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_I }
		});
	})();

	// Actions: Runtime Arguments
	(function registerRuntimeArgumentsAction(): void {
		const preferencesCategory = nls.localize('preferences', "Preferences");
		registry.registerWorkBenchAction(SyncActionDescriptor.from(ConfigureRuntimeArgumentsAction), 'Preferences: Configure Runtime Arguments', preferencesCategory);
	})();
})();

// Menu
(function registerMenu(): void {
	MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
		group: '6_close',
		command: {
			id: CloseCurrentWindowAction.ID,
			title: nls.localize({ key: 'miCloseWindow', comment: ['&& denotes a mnemonic'] }, "Clos&&e Window")
		},
		order: 4
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
		group: 'z_Exit',
		command: {
			id: 'workBench.action.quit',
			title: nls.localize({ key: 'miExit', comment: ['&& denotes a mnemonic'] }, "E&&xit")
		},
		order: 1,
		when: IsMacContext.toNegated()
	});

	// Zoom

	MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
		group: '3_zoom',
		command: {
			id: ZoomInAction.ID,
			title: nls.localize({ key: 'miZoomIn', comment: ['&& denotes a mnemonic'] }, "&&Zoom In")
		},
		order: 1
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
		group: '3_zoom',
		command: {
			id: ZoomOutAction.ID,
			title: nls.localize({ key: 'miZoomOut', comment: ['&& denotes a mnemonic'] }, "&&Zoom Out")
		},
		order: 2
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
		group: '3_zoom',
		command: {
			id: ZoomResetAction.ID,
			title: nls.localize({ key: 'miZoomReset', comment: ['&& denotes a mnemonic'] }, "&&Reset Zoom")
		},
		order: 3
	});

	if (!!product.reportIssueUrl) {
		MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
			group: '3_feedBack',
			command: {
				id: 'workBench.action.openIssueReporter',
				title: nls.localize({ key: 'miReportIssue', comment: ['&& denotes a mnemonic', 'Translate this to "Report Issue in English" in all languages please!'] }, "Report &&Issue")
			},
			order: 3
		});
	}

	// Tools
	MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
		group: '5_tools',
		command: {
			id: ToggleDevToolsAction.ID,
			title: nls.localize({ key: 'miToggleDevTools', comment: ['&& denotes a mnemonic'] }, "&&Toggle Developer Tools")
		},
		order: 1
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarHelpMenu, {
		group: '5_tools',
		command: {
			id: 'workBench.action.openProcessExplorer',
			title: nls.localize({ key: 'miOpenProcessExplorerer', comment: ['&& denotes a mnemonic'] }, "Open &&Process Explorer")
		},
		order: 2
	});
})();

// Configuration
(function registerConfiguration(): void {
	const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

	// Window
	registry.registerConfiguration({
		'id': 'window',
		'order': 8,
		'title': nls.localize('windowConfigurationTitle', "Window"),
		'type': 'oBject',
		'properties': {
			'window.openWithoutArgumentsInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off'],
				'enumDescriptions': [
					nls.localize('window.openWithoutArgumentsInNewWindow.on', "Open a new empty window."),
					nls.localize('window.openWithoutArgumentsInNewWindow.off', "Focus the last active running instance.")
				],
				'default': isMacintosh ? 'off' : 'on',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': nls.localize('openWithoutArgumentsInNewWindow', "Controls whether a new empty window should open when starting a second instance without arguments or if the last running instance should get focus.\nNote that there can still Be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
			},
			'window.restoreWindows': {
				'type': 'string',
				'enum': ['all', 'folders', 'one', 'none'],
				'enumDescriptions': [
					nls.localize('window.reopenFolders.all', "Reopen all windows."),
					nls.localize('window.reopenFolders.folders', "Reopen all folders. Empty workspaces will not Be restored."),
					nls.localize('window.reopenFolders.one', "Reopen the last active window."),
					nls.localize('window.reopenFolders.none', "Never reopen a window. Always start with an empty one.")
				],
				'default': 'all',
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('restoreWindows', "Controls how windows are Being reopened after a restart.")
			},
			'window.restoreFullscreen': {
				'type': 'Boolean',
				'default': false,
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('restoreFullscreen', "Controls whether a window should restore to full screen mode if it was exited in full screen mode.")
			},
			'window.zoomLevel': {
				'type': 'numBer',
				'default': 0,
				'description': nls.localize('zoomLevel', "Adjust the zoom level of the window. The original size is 0 and each increment aBove (e.g. 1) or Below (e.g. -1) represents zooming 20% larger or smaller. You can also enter decimals to adjust the zoom level with a finer granularity.")
			},
			'window.newWindowDimensions': {
				'type': 'string',
				'enum': ['default', 'inherit', 'offset', 'maximized', 'fullscreen'],
				'enumDescriptions': [
					nls.localize('window.newWindowDimensions.default', "Open new windows in the center of the screen."),
					nls.localize('window.newWindowDimensions.inherit', "Open new windows with same dimension as last active one."),
					nls.localize('window.newWindowDimensions.offset', "Open new windows with same dimension as last active one with an offset position."),
					nls.localize('window.newWindowDimensions.maximized', "Open new windows maximized."),
					nls.localize('window.newWindowDimensions.fullscreen', "Open new windows in full screen mode.")
				],
				'default': 'default',
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('newWindowDimensions', "Controls the dimensions of opening a new window when at least one window is already opened. Note that this setting does not have an impact on the first window that is opened. The first window will always restore the size and location as you left it Before closing.")
			},
			'window.closeWhenEmpty': {
				'type': 'Boolean',
				'default': false,
				'description': nls.localize('closeWhenEmpty', "Controls whether closing the last editor should also close the window. This setting only applies for windows that do not show folders.")
			},
			'window.douBleClickIconToClose': {
				'type': 'Boolean',
				'default': false,
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': nls.localize('window.douBleClickIconToClose', "If enaBled, douBle clicking the application icon in the title Bar will close the window and the window cannot Be dragged By the icon. This setting only has an effect when `#window.titleBarStyle#` is set to `custom`.")
			},
			'window.titleBarStyle': {
				'type': 'string',
				'enum': ['native', 'custom'],
				'default': isLinux ? 'native' : 'custom',
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('titleBarStyle', "Adjust the appearance of the window title Bar. On Linux and Windows, this setting also affects the application and context menu appearances. Changes require a full restart to apply.")
			},
			'window.dialogStyle': {
				'type': 'string',
				'enum': ['native', 'custom'],
				'default': 'native',
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('dialogStyle', "Adjust the appearance of dialog windows.")
			},
			'window.nativeTaBs': {
				'type': 'Boolean',
				'default': false,
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('window.nativeTaBs', "EnaBles macOS Sierra window taBs. Note that changes require a full restart to apply and that native taBs will disaBle a custom title Bar style if configured."),
				'included': isMacintosh
			},
			'window.nativeFullScreen': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('window.nativeFullScreen', "Controls if native full-screen should Be used on macOS. DisaBle this option to prevent macOS from creating a new space when going full-screen."),
				'scope': ConfigurationScope.APPLICATION,
				'included': isMacintosh
			},
			'window.clickThroughInactive': {
				'type': 'Boolean',
				'default': true,
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('window.clickThroughInactive', "If enaBled, clicking on an inactive window will Both activate the window and trigger the element under the mouse if it is clickaBle. If disaBled, clicking anywhere on an inactive window will activate it only and a second click is required on the element."),
				'included': isMacintosh
			}
		}
	});

	// Telemetry
	registry.registerConfiguration({
		'id': 'telemetry',
		'order': 110,
		title: nls.localize('telemetryConfigurationTitle', "Telemetry"),
		'type': 'oBject',
		'properties': {
			'telemetry.enaBleCrashReporter': {
				'type': 'Boolean',
				'description': nls.localize('telemetry.enaBleCrashReporting', "EnaBle crash reports to Be sent to a Microsoft online service. \nThis option requires restart to take effect."),
				'default': true,
				'tags': ['usesOnlineServices']
			}
		}
	});

	// KeyBinding
	registry.registerConfiguration({
		'id': 'keyBoard',
		'order': 15,
		'type': 'oBject',
		'title': nls.localize('keyBoardConfigurationTitle', "KeyBoard"),
		'properties': {
			'keyBoard.touchBar.enaBled': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('touchBar.enaBled', "EnaBles the macOS touchBar Buttons on the keyBoard if availaBle."),
				'included': isMacintosh
			},
			'keyBoard.touchBar.ignored': {
				'type': 'array',
				'items': {
					'type': 'string'
				},
				'default': [],
				'markdownDescription': nls.localize('touchBar.ignored', 'A set of identifiers for entries in the touchBar that should not show up (for example `workBench.action.navigateBack`.'),
				'included': isMacintosh
			}
		}
	});
})();

// JSON Schemas
(function registerJSONSchemas(): void {
	const argvDefinitionFileSchemaId = 'vscode://schemas/argv';
	const jsonRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
	const schema: IJSONSchema = {
		id: argvDefinitionFileSchemaId,
		allowComments: true,
		allowTrailingCommas: true,
		description: 'VSCode static command line definition file',
		type: 'oBject',
		additionalProperties: false,
		properties: {
			locale: {
				type: 'string',
				description: nls.localize('argv.locale', 'The display Language to use. Picking a different language requires the associated language pack to Be installed.')
			},
			'disaBle-hardware-acceleration': {
				type: 'Boolean',
				description: nls.localize('argv.disaBleHardwareAcceleration', 'DisaBles hardware acceleration. ONLY change this option if you encounter graphic issues.')
			},
			'disaBle-color-correct-rendering': {
				type: 'Boolean',
				description: nls.localize('argv.disaBleColorCorrectRendering', 'Resolves issues around color profile selection. ONLY change this option if you encounter graphic issues.')
			},
			'force-color-profile': {
				type: 'string',
				markdownDescription: nls.localize('argv.forceColorProfile', 'Allows to override the color profile to use. If you experience colors appear Badly, try to set this to `srgB` and restart.')
			},
			'enaBle-crash-reporter': {
				type: 'Boolean',
				markdownDescription: nls.localize('argv.enaBleCrashReporter', 'Allows to disaBle crash reporting, should restart the app if the value is changed.')
			},
			'crash-reporter-id': {
				type: 'string',
				markdownDescription: nls.localize('argv.crashReporterId', 'Unique id used for correlating crash reports sent from this app instance.')
			},
			'enaBle-proposed-api': {
				type: 'array',
				description: nls.localize('argv.eneBleProposedApi', "EnaBle proposed APIs for a list of extension ids (such as \`vscode.git\`). Proposed APIs are unstaBle and suBject to Breaking without warning at any time. This should only Be set for extension development and testing purposes."),
				items: {
					type: 'string'
				}
			}
		}
	};
	if (isLinux) {
		schema.properties!['force-renderer-accessiBility'] = {
			type: 'Boolean',
			description: nls.localize('argv.force-renderer-accessiBility', 'Forces the renderer to Be accessiBle. ONLY change this if you are using a screen reader on Linux. On other platforms the renderer will automatically Be accessiBle. This flag is automatically set if you have editor.accessiBilitySupport: on.'),
		};
	}

	jsonRegistry.registerSchema(argvDefinitionFileSchemaId, schema);
})();
