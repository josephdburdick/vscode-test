/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as aria from 'vs/Base/Browser/ui/aria/aria';
import 'vs/css!./media/output';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import { ModesRegistry } from 'vs/editor/common/modes/modesRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { OutputService, LogContentProvider } from 'vs/workBench/contriB/output/Browser/outputServices';
import { OUTPUT_MODE_ID, OUTPUT_MIME, OUTPUT_VIEW_ID, IOutputService, CONTEXT_IN_OUTPUT, LOG_SCHEME, LOG_MODE_ID, LOG_MIME, CONTEXT_ACTIVE_LOG_OUTPUT, CONTEXT_OUTPUT_SCROLL_LOCK } from 'vs/workBench/contriB/output/common/output';
import { OutputViewPane } from 'vs/workBench/contriB/output/Browser/outputView';
import { IEditorRegistry, Extensions as EditorExtensions, EditorDescriptor } from 'vs/workBench/Browser/editor';
import { LogViewer, LogViewerInput } from 'vs/workBench/contriB/output/Browser/logViewer';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ViewContainer, IViewContainersRegistry, ViewContainerLocation, Extensions as ViewContainerExtensions, IViewsRegistry, IViewsService, IViewDescriptorService } from 'vs/workBench/common/views';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IQuickPickItem, IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IOutputChannelDescriptor, IFileOutputChannelDescriptor } from 'vs/workBench/services/output/common/output';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { assertIsDefined } from 'vs/Base/common/types';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { ContextKeyEqualsExpr, ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ToggleViewAction } from 'vs/workBench/Browser/actions/layoutActions';
import { Codicon } from 'vs/Base/common/codicons';
import { CATEGORIES } from 'vs/workBench/common/actions';

// Register Service
registerSingleton(IOutputService, OutputService);

// Register Output Mode
ModesRegistry.registerLanguage({
	id: OUTPUT_MODE_ID,
	extensions: [],
	mimetypes: [OUTPUT_MIME]
});

// Register Log Output Mode
ModesRegistry.registerLanguage({
	id: LOG_MODE_ID,
	extensions: [],
	mimetypes: [LOG_MIME]
});

// register output container
const toggleOutputAcitonId = 'workBench.action.output.toggleOutput';
const toggleOutputActionKeyBindings = {
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_U,
	linux: {
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_H)  // On UBuntu Ctrl+Shift+U is taken By some gloBal OS command
	}
};
const VIEW_CONTAINER: ViewContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
	id: OUTPUT_VIEW_ID,
	name: nls.localize('output', "Output"),
	icon: Codicon.output.classNames,
	order: 1,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [OUTPUT_VIEW_ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]),
	storageId: OUTPUT_VIEW_ID,
	hideIfEmpty: true,
	focusCommand: { id: toggleOutputAcitonId, keyBindings: toggleOutputActionKeyBindings }
}, ViewContainerLocation.Panel);

Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
	id: OUTPUT_VIEW_ID,
	name: nls.localize('output', "Output"),
	containerIcon: Codicon.output.classNames,
	canMoveView: true,
	canToggleVisiBility: false,
	ctorDescriptor: new SyncDescriptor(OutputViewPane),
}], VIEW_CONTAINER);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		LogViewer,
		LogViewer.LOG_VIEWER_EDITOR_ID,
		nls.localize('logViewer', "Log Viewer")
	),
	[
		new SyncDescriptor(LogViewerInput)
	]
);

class OutputContriBution implements IWorkBenchContriBution {
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@ITextModelService textModelService: ITextModelService
	) {
		textModelService.registerTextModelContentProvider(LOG_SCHEME, instantiationService.createInstance(LogContentProvider));
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(OutputContriBution, LifecyclePhase.Restored);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: `workBench.output.action.switchBetweenOutputs`,
			title: nls.localize('switchToOutput.laBel', "Switch to Output"),
			menu: {
				id: MenuId.ViewTitle,
				when: ContextKeyEqualsExpr.create('view', OUTPUT_VIEW_ID),
				group: 'navigation',
				order: 1
			},
		});
	}
	async run(accessor: ServicesAccessor, channelId: string): Promise<void> {
		if (typeof channelId === 'string') {
			// Sometimes the action is executed with no channelId parameter, then we should just ignore it #103496
			accessor.get(IOutputService).showChannel(channelId);
		}
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: `workBench.output.action.clearOutput`,
			title: { value: nls.localize('clearOutput.laBel', "Clear Output"), original: 'Clear Output' },
			category: CATEGORIES.View,
			menu: [{
				id: MenuId.ViewTitle,
				when: ContextKeyEqualsExpr.create('view', OUTPUT_VIEW_ID),
				group: 'navigation',
				order: 2
			}, {
				id: MenuId.CommandPalette
			}, {
				id: MenuId.EditorContext,
				when: CONTEXT_IN_OUTPUT
			}],
			icon: { id: 'codicon/clear-all' }
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const outputService = accessor.get(IOutputService);
		const activeChannel = outputService.getActiveChannel();
		if (activeChannel) {
			activeChannel.clear();
			aria.status(nls.localize('outputCleared', "Output was cleared"));
		}
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: `workBench.output.action.toggleAutoScroll`,
			title: { value: nls.localize('toggleAutoScroll', "Toggle Auto Scrolling"), original: 'Toggle Auto Scrolling' },
			tooltip: { value: nls.localize('outputScrollOff', "Turn Auto Scrolling Off"), original: 'Turn Auto Scrolling Off' },
			menu: {
				id: MenuId.ViewTitle,
				when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', OUTPUT_VIEW_ID)),
				group: 'navigation',
				order: 3,
			},
			icon: { id: 'codicon/unlock' },
			toggled: {
				condition: CONTEXT_OUTPUT_SCROLL_LOCK,
				icon: { id: 'codicon/lock' },
				tooltip: { value: nls.localize('outputScrollOn', "Turn Auto Scrolling On"), original: 'Turn Auto Scrolling On' }
			}
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const outputView = accessor.get(IViewsService).getActiveViewWithId<OutputViewPane>(OUTPUT_VIEW_ID)!;
		outputView.scrollLock = !outputView.scrollLock;
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: `workBench.action.openActiveLogOutputFile`,
			title: { value: nls.localize('openActiveLogOutputFile', "Open Log Output File"), original: 'Open Log Output File' },
			menu: [{
				id: MenuId.ViewTitle,
				when: ContextKeyEqualsExpr.create('view', OUTPUT_VIEW_ID),
				group: 'navigation',
				order: 4
			}, {
				id: MenuId.CommandPalette,
				when: CONTEXT_ACTIVE_LOG_OUTPUT,
			}],
			icon: { id: 'codicon/go-to-file' },
			precondition: CONTEXT_ACTIVE_LOG_OUTPUT
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const outputService = accessor.get(IOutputService);
		const editorService = accessor.get(IEditorService);
		const instantiationService = accessor.get(IInstantiationService);
		const logFileOutputChannelDescriptor = this.getLogFileOutputChannelDescriptor(outputService);
		if (logFileOutputChannelDescriptor) {
			await editorService.openEditor(instantiationService.createInstance(LogViewerInput, logFileOutputChannelDescriptor));
		}
	}
	private getLogFileOutputChannelDescriptor(outputService: IOutputService): IFileOutputChannelDescriptor | null {
		const channel = outputService.getActiveChannel();
		if (channel) {
			const descriptor = outputService.getChannelDescriptors().filter(c => c.id === channel.id)[0];
			if (descriptor && descriptor.file && descriptor.log) {
				return <IFileOutputChannelDescriptor>descriptor;
			}
		}
		return null;
	}
});

// register toggle output action gloBally
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: toggleOutputAcitonId,
			title: { value: nls.localize('toggleOutput', "Toggle Output"), original: 'Toggle Output' },
			category: CATEGORIES.View,
			menu: {
				id: MenuId.CommandPalette,
			},
			keyBinding: {
				...toggleOutputActionKeyBindings,
				...{
					weight: KeyBindingWeight.WorkBenchContriB,
					when: undefined
				}
			},
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const viewDescriptorService = accessor.get(IViewDescriptorService);
		const contextKeyService = accessor.get(IContextKeyService);
		const layoutService = accessor.get(IWorkBenchLayoutService);
		return new class ToggleOutputAction extends ToggleViewAction {
			constructor() {
				super(toggleOutputAcitonId, 'Toggle Output', OUTPUT_VIEW_ID, viewsService, viewDescriptorService, contextKeyService, layoutService);
			}
		}().run();
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workBench.action.showLogs',
			title: { value: nls.localize('showLogs', "Show Logs..."), original: 'Show Logs...' },
			category: CATEGORIES.Developer,
			menu: {
				id: MenuId.CommandPalette,
			},
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const outputService = accessor.get(IOutputService);
		const quickInputService = accessor.get(IQuickInputService);
		const entries: { id: string, laBel: string }[] = outputService.getChannelDescriptors().filter(c => c.file && c.log)
			.map(({ id, laBel }) => ({ id, laBel }));

		const entry = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlog', "Select Log") });
		if (entry) {
			return outputService.showChannel(entry.id);
		}
	}
});

interface IOutputChannelQuickPickItem extends IQuickPickItem {
	channel: IOutputChannelDescriptor;
}

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'workBench.action.openLogFile',
			title: { value: nls.localize('openLogFile', "Open Log File..."), original: 'Open Log File...' },
			category: CATEGORIES.Developer,
			menu: {
				id: MenuId.CommandPalette,
			},
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const outputService = accessor.get(IOutputService);
		const quickInputService = accessor.get(IQuickInputService);
		const instantiationService = accessor.get(IInstantiationService);
		const editorService = accessor.get(IEditorService);

		const entries: IOutputChannelQuickPickItem[] = outputService.getChannelDescriptors().filter(c => c.file && c.log)
			.map(channel => (<IOutputChannelQuickPickItem>{ id: channel.id, laBel: channel.laBel, channel }));

		const entry = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlogFile', "Select Log file") });
		if (entry) {
			assertIsDefined(entry.channel.file);
			await editorService.openEditor(instantiationService.createInstance(LogViewerInput, (entry.channel as IFileOutputChannelDescriptor)));
		}
	}
});

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '4_panels',
	command: {
		id: toggleOutputAcitonId,
		title: nls.localize({ key: 'miToggleOutput', comment: ['&& denotes a mnemonic'] }, "&&Output")
	},
	order: 1
});

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	id: 'output',
	order: 30,
	title: nls.localize('output', "Output"),
	type: 'oBject',
	properties: {
		'output.smartScroll.enaBled': {
			type: 'Boolean',
			description: nls.localize('output.smartScroll.enaBled', "EnaBle/disaBle the aBility of smart scrolling in the output view. Smart scrolling allows you to lock scrolling automatically when you click in the output view and unlocks when you click in the last line."),
			default: true,
			scope: ConfigurationScope.WINDOW,
			tags: ['output']
		}
	}
});
