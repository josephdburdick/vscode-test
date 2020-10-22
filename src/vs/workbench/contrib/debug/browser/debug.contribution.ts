/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/deBug.contriBution';
import 'vs/css!./media/deBugHover';
import * as nls from 'vs/nls';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkBenchActionRegistry, Extensions as WorkBenchActionRegistryExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { BreakpointsView } from 'vs/workBench/contriB/deBug/Browser/BreakpointsView';
import { CallStackView } from 'vs/workBench/contriB/deBug/Browser/callStackView';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import {
	IDeBugService, VIEWLET_ID, DEBUG_PANEL_ID, CONTEXT_IN_DEBUG_MODE, INTERNAL_CONSOLE_OPTIONS_SCHEMA,
	CONTEXT_DEBUG_STATE, VARIABLES_VIEW_ID, CALLSTACK_VIEW_ID, WATCH_VIEW_ID, BREAKPOINTS_VIEW_ID, LOADED_SCRIPTS_VIEW_ID, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_DEBUG_UX, BREAKPOINT_EDITOR_CONTRIBUTION_ID, REPL_VIEW_ID, CONTEXT_BREAKPOINTS_EXIST, EDITOR_CONTRIBUTION_ID, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_SET_VARIABLE_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT,
} from 'vs/workBench/contriB/deBug/common/deBug';
import { StartAction, AddFunctionBreakpointAction, ConfigureAction, DisaBleAllBreakpointsAction, EnaBleAllBreakpointsAction, RemoveAllBreakpointsAction, RunAction, ReapplyBreakpointsAction, SelectAndStartAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { DeBugToolBar } from 'vs/workBench/contriB/deBug/Browser/deBugToolBar';
import { DeBugService } from 'vs/workBench/contriB/deBug/Browser/deBugService';
import { registerCommands, ADD_CONFIGURATION_ID, TOGGLE_INLINE_BREAKPOINT_ID, COPY_STACK_TRACE_ID, REVERSE_CONTINUE_ID, STEP_BACK_ID, RESTART_SESSION_ID, TERMINATE_THREAD_ID, STEP_OVER_ID, STEP_INTO_ID, STEP_OUT_ID, PAUSE_ID, DISCONNECT_ID, STOP_ID, RESTART_FRAME_ID, CONTINUE_ID, FOCUS_REPL_ID, JUMP_TO_CURSOR_ID, RESTART_LABEL, STEP_INTO_LABEL, STEP_OVER_LABEL, STEP_OUT_LABEL, PAUSE_LABEL, DISCONNECT_LABEL, STOP_LABEL, CONTINUE_LABEL } from 'vs/workBench/contriB/deBug/Browser/deBugCommands';
import { StatusBarColorProvider } from 'vs/workBench/contriB/deBug/Browser/statusBarColorProvider';
import { IViewsRegistry, Extensions as ViewExtensions, IViewContainersRegistry, ViewContainerLocation, ViewContainer } from 'vs/workBench/common/views';
import { isMacintosh, isWeB } from 'vs/Base/common/platform';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { URI } from 'vs/Base/common/uri';
import { DeBugStatusContriBution } from 'vs/workBench/contriB/deBug/Browser/deBugStatus';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { launchSchemaId } from 'vs/workBench/services/configuration/common/configuration';
import { LoadedScriptsView } from 'vs/workBench/contriB/deBug/Browser/loadedScriptsView';
import { ADD_LOG_POINT_ID, TOGGLE_CONDITIONAL_BREAKPOINT_ID, TOGGLE_BREAKPOINT_ID, RunToCursorAction, registerEditorActions } from 'vs/workBench/contriB/deBug/Browser/deBugEditorActions';
import { WatchExpressionsView } from 'vs/workBench/contriB/deBug/Browser/watchExpressionsView';
import { VariaBlesView, SET_VARIABLE_ID, COPY_VALUE_ID, BREAK_WHEN_VALUE_CHANGES_ID, COPY_EVALUATE_PATH_ID, ADD_TO_WATCH_ID } from 'vs/workBench/contriB/deBug/Browser/variaBlesView';
import { ClearReplAction, Repl } from 'vs/workBench/contriB/deBug/Browser/repl';
import { DeBugContentProvider } from 'vs/workBench/contriB/deBug/common/deBugContentProvider';
import { WelcomeView } from 'vs/workBench/contriB/deBug/Browser/welcomeView';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { DeBugViewPaneContainer, OpenDeBugConsoleAction, OpenDeBugViewletAction } from 'vs/workBench/contriB/deBug/Browser/deBugViewlet';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { CallStackEditorContriBution } from 'vs/workBench/contriB/deBug/Browser/callStackEditorContriBution';
import { BreakpointEditorContriBution } from 'vs/workBench/contriB/deBug/Browser/BreakpointEditorContriBution';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IQuickAccessRegistry, Extensions as QuickAccessExtensions } from 'vs/platform/quickinput/common/quickAccess';
import { StartDeBugQuickAccessProvider } from 'vs/workBench/contriB/deBug/Browser/deBugQuickAccess';
import { DeBugProgressContriBution } from 'vs/workBench/contriB/deBug/Browser/deBugProgress';
import { DeBugTitleContriBution } from 'vs/workBench/contriB/deBug/Browser/deBugTitle';
import { Codicon } from 'vs/Base/common/codicons';
import { registerColors } from 'vs/workBench/contriB/deBug/Browser/deBugColors';
import { DeBugEditorContriBution } from 'vs/workBench/contriB/deBug/Browser/deBugEditorContriBution';
import { FileAccess } from 'vs/Base/common/network';

const registry = Registry.as<IWorkBenchActionRegistry>(WorkBenchActionRegistryExtensions.WorkBenchActions);
const deBugCategory = nls.localize('deBugCategory', "DeBug");
const runCategroy = nls.localize('runCategory', "Run");
registerWorkBenchContriButions();
registerColors();
registerCommandsAndActions();
registerDeBugMenu();
registerEditorActions();
registerCommands();
registerDeBugPanel();
registry.registerWorkBenchAction(SyncActionDescriptor.from(StartAction, { primary: KeyCode.F5 }, CONTEXT_IN_DEBUG_MODE.toNegated()), 'DeBug: Start DeBugging', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
registry.registerWorkBenchAction(SyncActionDescriptor.from(RunAction, { primary: KeyMod.CtrlCmd | KeyCode.F5, mac: { primary: KeyMod.WinCtrl | KeyCode.F5 } }), 'Run: Start Without DeBugging', runCategroy, CONTEXT_DEBUGGERS_AVAILABLE);

registerSingleton(IDeBugService, DeBugService, true);
registerDeBugView();
registerConfiguration();
regsiterEditorContriButions();

function registerWorkBenchContriButions(): void {
	// Register DeBug WorkBench ContriButions
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DeBugStatusContriBution, LifecyclePhase.Eventually);
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DeBugProgressContriBution, LifecyclePhase.Eventually);
	if (isWeB) {
		Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DeBugTitleContriBution, LifecyclePhase.Eventually);
	}
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DeBugToolBar, LifecyclePhase.Restored);
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DeBugContentProvider, LifecyclePhase.Eventually);
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(StatusBarColorProvider, LifecyclePhase.Eventually);

	// Register Quick Access
	Registry.as<IQuickAccessRegistry>(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
		ctor: StartDeBugQuickAccessProvider,
		prefix: StartDeBugQuickAccessProvider.PREFIX,
		contextKey: 'inLaunchConfigurationsPicker',
		placeholder: nls.localize('startDeBugPlaceholder', "Type the name of a launch configuration to run."),
		helpEntries: [{ description: nls.localize('startDeBuggingHelp', "Start DeBugging"), needsEditor: false }]
	});

}

function regsiterEditorContriButions(): void {
	registerEditorContriBution('editor.contriB.callStack', CallStackEditorContriBution);
	registerEditorContriBution(BREAKPOINT_EDITOR_CONTRIBUTION_ID, BreakpointEditorContriBution);
	registerEditorContriBution(EDITOR_CONTRIBUTION_ID, DeBugEditorContriBution);
}

function registerCommandsAndActions(): void {

	registry.registerWorkBenchAction(SyncActionDescriptor.from(ConfigureAction), 'DeBug: Open launch.json', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(AddFunctionBreakpointAction), 'DeBug: Add Function Breakpoint', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(ReapplyBreakpointsAction), 'DeBug: Reapply All Breakpoints', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(RemoveAllBreakpointsAction), 'DeBug: Remove All Breakpoints', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(EnaBleAllBreakpointsAction), 'DeBug: EnaBle All Breakpoints', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(DisaBleAllBreakpointsAction), 'DeBug: DisaBle All Breakpoints', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(SelectAndStartAction), 'DeBug: Select and Start DeBugging', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(ClearReplAction), 'DeBug: Clear Console', deBugCategory, CONTEXT_DEBUGGERS_AVAILABLE);

	const registerDeBugCommandPaletteItem = (id: string, title: string, when?: ContextKeyExpression, precondition?: ContextKeyExpression) => {
		MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
			when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, when),
			command: {
				id,
				title: `DeBug: ${title}`,
				precondition
			}
		});
	};

	registerDeBugCommandPaletteItem(RESTART_SESSION_ID, RESTART_LABEL);
	registerDeBugCommandPaletteItem(TERMINATE_THREAD_ID, nls.localize('terminateThread', "Terminate Thread"), CONTEXT_IN_DEBUG_MODE);
	registerDeBugCommandPaletteItem(STEP_OVER_ID, STEP_OVER_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugCommandPaletteItem(STEP_INTO_ID, STEP_INTO_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugCommandPaletteItem(STEP_OUT_ID, STEP_OUT_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugCommandPaletteItem(PAUSE_ID, PAUSE_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('running'));
	registerDeBugCommandPaletteItem(DISCONNECT_ID, DISCONNECT_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_FOCUSED_SESSION_IS_ATTACH);
	registerDeBugCommandPaletteItem(STOP_ID, STOP_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated());
	registerDeBugCommandPaletteItem(CONTINUE_ID, CONTINUE_LABEL, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugCommandPaletteItem(FOCUS_REPL_ID, nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'deBugFocusConsole' }, 'Focus on DeBug Console View'));
	registerDeBugCommandPaletteItem(JUMP_TO_CURSOR_ID, nls.localize('jumpToCursor', "Jump to Cursor"), CONTEXT_JUMP_TO_CURSOR_SUPPORTED);
	registerDeBugCommandPaletteItem(JUMP_TO_CURSOR_ID, nls.localize('SetNextStatement', "Set Next Statement"), CONTEXT_JUMP_TO_CURSOR_SUPPORTED);
	registerDeBugCommandPaletteItem(RunToCursorAction.ID, RunToCursorAction.LABEL, ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped')));
	registerDeBugCommandPaletteItem(TOGGLE_INLINE_BREAKPOINT_ID, nls.localize('inlineBreakpoint', "Inline Breakpoint"));

	// DeBug toolBar

	const registerDeBugToolBarItem = (id: string, title: string, order: numBer, icon: { light?: URI, dark?: URI } | ThemeIcon, when?: ContextKeyExpression, precondition?: ContextKeyExpression) => {
		MenuRegistry.appendMenuItem(MenuId.DeBugToolBar, {
			group: 'navigation',
			when,
			order,
			command: {
				id,
				title,
				icon,
				precondition
			}
		});
	};

	registerDeBugToolBarItem(CONTINUE_ID, CONTINUE_LABEL, 10, { id: 'codicon/deBug-continue' }, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugToolBarItem(PAUSE_ID, PAUSE_LABEL, 10, { id: 'codicon/deBug-pause' }, CONTEXT_DEBUG_STATE.notEqualsTo('stopped'), CONTEXT_DEBUG_STATE.isEqualTo('running'));
	registerDeBugToolBarItem(STOP_ID, STOP_LABEL, 70, { id: 'codicon/deBug-stop' }, CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated());
	registerDeBugToolBarItem(DISCONNECT_ID, DISCONNECT_LABEL, 70, { id: 'codicon/deBug-disconnect' }, CONTEXT_FOCUSED_SESSION_IS_ATTACH);
	registerDeBugToolBarItem(STEP_OVER_ID, STEP_OVER_LABEL, 20, { id: 'codicon/deBug-step-over' }, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugToolBarItem(STEP_INTO_ID, STEP_INTO_LABEL, 30, { id: 'codicon/deBug-step-into' }, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugToolBarItem(STEP_OUT_ID, STEP_OUT_LABEL, 40, { id: 'codicon/deBug-step-out' }, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugToolBarItem(RESTART_SESSION_ID, RESTART_LABEL, 60, { id: 'codicon/deBug-restart' });
	registerDeBugToolBarItem(STEP_BACK_ID, nls.localize('stepBackDeBug', "Step Back"), 50, { id: 'codicon/deBug-step-Back' }, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugToolBarItem(REVERSE_CONTINUE_ID, nls.localize('reverseContinue', "Reverse"), 60, { id: 'codicon/deBug-reverse-continue' }, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));

	// DeBug callstack context menu
	const registerDeBugViewMenuItem = (menuId: MenuId, id: string, title: string, order: numBer, when?: ContextKeyExpression, precondition?: ContextKeyExpression, group = 'navigation') => {
		MenuRegistry.appendMenuItem(menuId, {
			group,
			when,
			order,
			command: {
				id,
				title,
				precondition
			}
		});
	};
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, RESTART_SESSION_ID, RESTART_LABEL, 10, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, STOP_ID, STOP_LABEL, 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, PAUSE_ID, PAUSE_LABEL, 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('running')));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, CONTINUE_ID, CONTINUE_LABEL, 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped')));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, STEP_OVER_ID, STEP_OVER_LABEL, 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, STEP_INTO_ID, STEP_INTO_LABEL, 30, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, STEP_OUT_ID, STEP_OUT_LABEL, 40, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, TERMINATE_THREAD_ID, nls.localize('terminateThread', "Terminate Thread"), 10, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), undefined, 'termination');
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, RESTART_FRAME_ID, nls.localize('restartFrame', "Restart Frame"), 10, ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'), CONTEXT_RESTART_FRAME_SUPPORTED));
	registerDeBugViewMenuItem(MenuId.DeBugCallStackContext, COPY_STACK_TRACE_ID, nls.localize('copyStackTrace', "Copy Call Stack"), 20, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'));

	registerDeBugViewMenuItem(MenuId.DeBugVariaBlesContext, SET_VARIABLE_ID, nls.localize('setValue', "Set Value"), 10, CONTEXT_SET_VARIABLE_SUPPORTED, undefined, '3_modification');
	registerDeBugViewMenuItem(MenuId.DeBugVariaBlesContext, COPY_VALUE_ID, nls.localize('copyValue', "Copy Value"), 10, undefined, undefined, '5_cutcopypaste');
	registerDeBugViewMenuItem(MenuId.DeBugVariaBlesContext, COPY_EVALUATE_PATH_ID, nls.localize('copyAsExpression', "Copy as Expression"), 20, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, '5_cutcopypaste');
	registerDeBugViewMenuItem(MenuId.DeBugVariaBlesContext, ADD_TO_WATCH_ID, nls.localize('addToWatchExpressions', "Add to Watch"), 100, CONTEXT_VARIABLE_EVALUATE_NAME_PRESENT, undefined, 'z_commands');
	registerDeBugViewMenuItem(MenuId.DeBugVariaBlesContext, BREAK_WHEN_VALUE_CHANGES_ID, nls.localize('BreakWhenValueChanges', "Break When Value Changes"), 200, CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, undefined, 'z_commands');

	// Touch Bar
	if (isMacintosh) {

		const registerTouchBarEntry = (id: string, title: string, order: numBer, when: ContextKeyExpression | undefined, iconUri: URI) => {
			MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
				command: {
					id,
					title,
					icon: { dark: iconUri }
				},
				when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, when),
				group: '9_deBug',
				order
			});
		};

		registerTouchBarEntry(StartAction.ID, StartAction.LABEL, 0, CONTEXT_IN_DEBUG_MODE.toNegated(), FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/continue-tB.png', require));
		registerTouchBarEntry(RunAction.ID, RunAction.LABEL, 1, CONTEXT_IN_DEBUG_MODE.toNegated(), FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/continue-without-deBugging-tB.png', require));
		registerTouchBarEntry(CONTINUE_ID, CONTINUE_LABEL, 0, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/continue-tB.png', require));
		registerTouchBarEntry(PAUSE_ID, PAUSE_LABEL, 1, ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, ContextKeyExpr.notEquals('deBugState', 'stopped')), FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/pause-tB.png', require));
		registerTouchBarEntry(STEP_OVER_ID, STEP_OVER_LABEL, 2, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/stepover-tB.png', require));
		registerTouchBarEntry(STEP_INTO_ID, STEP_INTO_LABEL, 3, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/stepinto-tB.png', require));
		registerTouchBarEntry(STEP_OUT_ID, STEP_OUT_LABEL, 4, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/stepout-tB.png', require));
		registerTouchBarEntry(RESTART_SESSION_ID, RESTART_LABEL, 5, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/restart-tB.png', require));
		registerTouchBarEntry(STOP_ID, STOP_LABEL, 6, CONTEXT_IN_DEBUG_MODE, FileAccess.asFileUri('vs/workBench/contriB/deBug/Browser/media/stop-tB.png', require));
	}
}

function registerDeBugMenu(): void {
	// View menu

	MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
		group: '3_views',
		command: {
			id: VIEWLET_ID,
			title: nls.localize({ key: 'miViewRun', comment: ['&& denotes a mnemonic'] }, "&&Run")
		},
		order: 4
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
		group: '4_panels',
		command: {
			id: OpenDeBugConsoleAction.ID,
			title: nls.localize({ key: 'miToggleDeBugConsole', comment: ['&& denotes a mnemonic'] }, "De&&Bug Console")
		},
		order: 2
	});

	// DeBug menu

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '1_deBug',
		command: {
			id: StartAction.ID,
			title: nls.localize({ key: 'miStartDeBugging', comment: ['&& denotes a mnemonic'] }, "&&Start DeBugging")
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '1_deBug',
		command: {
			id: RunAction.ID,
			title: nls.localize({ key: 'miRun', comment: ['&& denotes a mnemonic'] }, "Run &&Without DeBugging")
		},
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '1_deBug',
		command: {
			id: STOP_ID,
			title: nls.localize({ key: 'miStopDeBugging', comment: ['&& denotes a mnemonic'] }, "&&Stop DeBugging"),
			precondition: CONTEXT_IN_DEBUG_MODE
		},
		order: 3,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '1_deBug',
		command: {
			id: RESTART_SESSION_ID,
			title: nls.localize({ key: 'miRestart DeBugging', comment: ['&& denotes a mnemonic'] }, "&&Restart DeBugging"),
			precondition: CONTEXT_IN_DEBUG_MODE
		},
		order: 4,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	// Configuration
	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '2_configuration',
		command: {
			id: ConfigureAction.ID,
			title: nls.localize({ key: 'miOpenConfigurations', comment: ['&& denotes a mnemonic'] }, "Open &&Configurations")
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '2_configuration',
		command: {
			id: ADD_CONFIGURATION_ID,
			title: nls.localize({ key: 'miAddConfiguration', comment: ['&& denotes a mnemonic'] }, "A&&dd Configuration...")
		},
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	// Step Commands
	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '3_step',
		command: {
			id: STEP_OVER_ID,
			title: nls.localize({ key: 'miStepOver', comment: ['&& denotes a mnemonic'] }, "Step &&Over"),
			precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped')
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '3_step',
		command: {
			id: STEP_INTO_ID,
			title: nls.localize({ key: 'miStepInto', comment: ['&& denotes a mnemonic'] }, "Step &&Into"),
			precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped')
		},
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '3_step',
		command: {
			id: STEP_OUT_ID,
			title: nls.localize({ key: 'miStepOut', comment: ['&& denotes a mnemonic'] }, "Step O&&ut"),
			precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped')
		},
		order: 3,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '3_step',
		command: {
			id: CONTINUE_ID,
			title: nls.localize({ key: 'miContinue', comment: ['&& denotes a mnemonic'] }, "&&Continue"),
			precondition: CONTEXT_DEBUG_STATE.isEqualTo('stopped')
		},
		order: 4,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	// New Breakpoints
	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '4_new_Breakpoint',
		command: {
			id: TOGGLE_BREAKPOINT_ID,
			title: nls.localize({ key: 'miToggleBreakpoint', comment: ['&& denotes a mnemonic'] }, "Toggle &&Breakpoint")
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarNewBreakpointMenu, {
		group: '1_Breakpoints',
		command: {
			id: TOGGLE_CONDITIONAL_BREAKPOINT_ID,
			title: nls.localize({ key: 'miConditionalBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Conditional Breakpoint...")
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarNewBreakpointMenu, {
		group: '1_Breakpoints',
		command: {
			id: TOGGLE_INLINE_BREAKPOINT_ID,
			title: nls.localize({ key: 'miInlineBreakpoint', comment: ['&& denotes a mnemonic'] }, "Inline Breakp&&oint")
		},
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarNewBreakpointMenu, {
		group: '1_Breakpoints',
		command: {
			id: AddFunctionBreakpointAction.ID,
			title: nls.localize({ key: 'miFunctionBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Function Breakpoint...")
		},
		order: 3,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarNewBreakpointMenu, {
		group: '1_Breakpoints',
		command: {
			id: ADD_LOG_POINT_ID,
			title: nls.localize({ key: 'miLogPoint', comment: ['&& denotes a mnemonic'] }, "&&Logpoint...")
		},
		order: 4,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '4_new_Breakpoint',
		title: nls.localize({ key: 'miNewBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&New Breakpoint"),
		suBmenu: MenuId.MenuBarNewBreakpointMenu,
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	// Modify Breakpoints
	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '5_Breakpoints',
		command: {
			id: EnaBleAllBreakpointsAction.ID,
			title: nls.localize({ key: 'miEnaBleAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "&&EnaBle All Breakpoints")
		},
		order: 1,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '5_Breakpoints',
		command: {
			id: DisaBleAllBreakpointsAction.ID,
			title: nls.localize({ key: 'miDisaBleAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "DisaBle A&&ll Breakpoints")
		},
		order: 2,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: '5_Breakpoints',
		command: {
			id: RemoveAllBreakpointsAction.ID,
			title: nls.localize({ key: 'miRemoveAllBreakpoints', comment: ['&& denotes a mnemonic'] }, "Remove &&All Breakpoints")
		},
		order: 3,
		when: CONTEXT_DEBUGGERS_AVAILABLE
	});

	// Install DeBuggers
	MenuRegistry.appendMenuItem(MenuId.MenuBarDeBugMenu, {
		group: 'z_install',
		command: {
			id: 'deBug.installAdditionalDeBuggers',
			title: nls.localize({ key: 'miInstallAdditionalDeBuggers', comment: ['&& denotes a mnemonic'] }, "&&Install Additional DeBuggers...")
		},
		order: 1
	});
}

function registerDeBugPanel(): void {
	// register repl panel

	const VIEW_CONTAINER: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
		id: DEBUG_PANEL_ID,
		name: nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'deBugPanel' }, 'DeBug Console'),
		icon: Codicon.deBugConsole.classNames,
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [DEBUG_PANEL_ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]),
		storageId: DEBUG_PANEL_ID,
		focusCommand: { id: OpenDeBugConsoleAction.ID },
		order: 2,
		hideIfEmpty: true
	}, ViewContainerLocation.Panel);

	Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
		id: REPL_VIEW_ID,
		name: nls.localize({ comment: ['DeBug is a noun in this context, not a verB.'], key: 'deBugPanel' }, 'DeBug Console'),
		containerIcon: Codicon.deBugConsole.classNames,
		canToggleVisiBility: false,
		canMoveView: true,
		when: CONTEXT_DEBUGGERS_AVAILABLE,
		ctorDescriptor: new SyncDescriptor(Repl),
	}], VIEW_CONTAINER);

	registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenDeBugConsoleAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Y }), 'View: DeBug Console', CATEGORIES.View.value, CONTEXT_DEBUGGERS_AVAILABLE);
}

function registerDeBugView(): void {
	const viewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
		id: VIEWLET_ID,
		name: nls.localize('run', "Run"),
		ctorDescriptor: new SyncDescriptor(DeBugViewPaneContainer),
		icon: Codicon.deBugAlt.classNames,
		alwaysUseContainerInfo: true,
		order: 2
	}, ViewContainerLocation.SideBar);
	registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenDeBugViewletAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_D }), 'View: Show Run and DeBug', CATEGORIES.View.value);

	// Register default deBug views
	const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
	viewsRegistry.registerViews([{ id: VARIABLES_VIEW_ID, name: nls.localize('variaBles', "VariaBles"), containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(VariaBlesView), order: 10, weight: 40, canToggleVisiBility: true, canMoveView: true, focusCommand: { id: 'workBench.deBug.action.focusVariaBlesView' }, when: CONTEXT_DEBUG_UX.isEqualTo('default') }], viewContainer);
	viewsRegistry.registerViews([{ id: WATCH_VIEW_ID, name: nls.localize('watch', "Watch"), containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(WatchExpressionsView), order: 20, weight: 10, canToggleVisiBility: true, canMoveView: true, focusCommand: { id: 'workBench.deBug.action.focusWatchView' }, when: CONTEXT_DEBUG_UX.isEqualTo('default') }], viewContainer);
	viewsRegistry.registerViews([{ id: CALLSTACK_VIEW_ID, name: nls.localize('callStack', "Call Stack"), containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(CallStackView), order: 30, weight: 30, canToggleVisiBility: true, canMoveView: true, focusCommand: { id: 'workBench.deBug.action.focusCallStackView' }, when: CONTEXT_DEBUG_UX.isEqualTo('default') }], viewContainer);
	viewsRegistry.registerViews([{ id: BREAKPOINTS_VIEW_ID, name: nls.localize('Breakpoints', "Breakpoints"), containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(BreakpointsView), order: 40, weight: 20, canToggleVisiBility: true, canMoveView: true, focusCommand: { id: 'workBench.deBug.action.focusBreakpointsView' }, when: ContextKeyExpr.or(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_DEBUG_UX.isEqualTo('default')) }], viewContainer);
	viewsRegistry.registerViews([{ id: WelcomeView.ID, name: WelcomeView.LABEL, containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(WelcomeView), order: 1, weight: 40, canToggleVisiBility: true, when: CONTEXT_DEBUG_UX.isEqualTo('simple') }], viewContainer);
	viewsRegistry.registerViews([{ id: LOADED_SCRIPTS_VIEW_ID, name: nls.localize('loadedScripts', "Loaded Scripts"), containerIcon: Codicon.deBugAlt.classNames, ctorDescriptor: new SyncDescriptor(LoadedScriptsView), order: 35, weight: 5, canToggleVisiBility: true, canMoveView: true, collapsed: true, when: ContextKeyExpr.and(CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_DEBUG_UX.isEqualTo('default')) }], viewContainer);
}

function registerConfiguration(): void {
	// Register configuration
	const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
	configurationRegistry.registerConfiguration({
		id: 'deBug',
		order: 20,
		title: nls.localize('deBugConfigurationTitle', "DeBug"),
		type: 'oBject',
		properties: {
			'deBug.allowBreakpointsEverywhere': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'allowBreakpointsEverywhere' }, "Allow setting Breakpoints in any file."),
				default: false
			},
			'deBug.openExplorerOnEnd': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'openExplorerOnEnd' }, "Automatically open the explorer view at the end of a deBug session."),
				default: false
			},
			'deBug.inlineValues': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'inlineValues' }, "Show variaBle values inline in editor while deBugging."),
				default: false
			},
			'deBug.toolBarLocation': {
				enum: ['floating', 'docked', 'hidden'],
				markdownDescription: nls.localize({ comment: ['This is the description for a setting'], key: 'toolBarLocation' }, "Controls the location of the deBug toolBar. Either `floating` in all views, `docked` in the deBug view, or `hidden`."),
				default: 'floating'
			},
			'deBug.showInStatusBar': {
				enum: ['never', 'always', 'onFirstSessionStart'],
				enumDescriptions: [nls.localize('never', "Never show deBug in status Bar"), nls.localize('always', "Always show deBug in status Bar"), nls.localize('onFirstSessionStart', "Show deBug in status Bar only after deBug was started for the first time")],
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'showInStatusBar' }, "Controls when the deBug status Bar should Be visiBle."),
				default: 'onFirstSessionStart'
			},
			'deBug.internalConsoleOptions': INTERNAL_CONSOLE_OPTIONS_SCHEMA,
			'deBug.console.closeOnEnd': {
				type: 'Boolean',
				description: nls.localize('deBug.console.closeOnEnd', "Controls if the deBug console should Be automatically closed when the deBug session ends."),
				default: false
			},
			'deBug.openDeBug': {
				enum: ['neverOpen', 'openOnSessionStart', 'openOnFirstSessionStart', 'openOnDeBugBreak'],
				default: 'openOnFirstSessionStart',
				description: nls.localize('openDeBug', "Controls when the deBug view should open.")
			},
			'deBug.showSuBSessionsInToolBar': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'showSuBSessionsInToolBar' }, "Controls whether the deBug suB-sessions are shown in the deBug tool Bar. When this setting is false the stop command on a suB-session will also stop the parent session."),
				default: false
			},
			'deBug.console.fontSize': {
				type: 'numBer',
				description: nls.localize('deBug.console.fontSize', "Controls the font size in pixels in the deBug console."),
				default: isMacintosh ? 12 : 14,
			},
			'deBug.console.fontFamily': {
				type: 'string',
				description: nls.localize('deBug.console.fontFamily', "Controls the font family in the deBug console."),
				default: 'default'
			},
			'deBug.console.lineHeight': {
				type: 'numBer',
				description: nls.localize('deBug.console.lineHeight', "Controls the line height in pixels in the deBug console. Use 0 to compute the line height from the font size."),
				default: 0
			},
			'deBug.console.wordWrap': {
				type: 'Boolean',
				description: nls.localize('deBug.console.wordWrap', "Controls if the lines should wrap in the deBug console."),
				default: true
			},
			'deBug.console.historySuggestions': {
				type: 'Boolean',
				description: nls.localize('deBug.console.historySuggestions', "Controls if the deBug console should suggest previously typed input."),
				default: true
			},
			'launch': {
				type: 'oBject',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'launch' }, "GloBal deBug launch configuration. Should Be used as an alternative to 'launch.json' that is shared across workspaces."),
				default: { configurations: [], compounds: [] },
				$ref: launchSchemaId
			},
			'deBug.focusWindowOnBreak': {
				type: 'Boolean',
				description: nls.localize('deBug.focusWindowOnBreak', "Controls whether the workBench window should Be focused when the deBugger Breaks."),
				default: true
			},
			'deBug.onTaskErrors': {
				enum: ['deBugAnyway', 'showErrors', 'prompt', 'aBort'],
				enumDescriptions: [nls.localize('deBugAnyway', "Ignore task errors and start deBugging."), nls.localize('showErrors', "Show the ProBlems view and do not start deBugging."), nls.localize('prompt', "Prompt user."), nls.localize('cancel', "Cancel deBugging.")],
				description: nls.localize('deBug.onTaskErrors', "Controls what to do when errors are encountered after running a preLaunchTask."),
				default: 'prompt'
			},
			'deBug.showBreakpointsInOverviewRuler': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'showBreakpointsInOverviewRuler' }, "Controls whether Breakpoints should Be shown in the overview ruler."),
				default: false
			},
			'deBug.showInlineBreakpointCandidates': {
				type: 'Boolean',
				description: nls.localize({ comment: ['This is the description for a setting'], key: 'showInlineBreakpointCandidates' }, "Controls whether inline Breakpoints candidate decorations should Be shown in the editor while deBugging."),
				default: true
			}
		}
	});
}
