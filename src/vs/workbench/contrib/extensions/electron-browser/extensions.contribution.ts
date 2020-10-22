/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkBenchActionRegistry, Extensions as WorkBenchActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { EditorDescriptor, IEditorRegistry, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { RuntimeExtensionsEditor, ShowRuntimeExtensionsAction, IExtensionHostProfileService, DeBugExtensionHostAction, StartExtensionHostProfileAction, StopExtensionHostProfileAction, CONTEXT_PROFILE_SESSION_STATE, SaveExtensionHostProfileAction, CONTEXT_EXTENSION_HOST_PROFILE_RECORDED } from 'vs/workBench/contriB/extensions/electron-Browser/runtimeExtensionsEditor';
import { EditorInput, IEditorInputFactory, IEditorInputFactoryRegistry, Extensions as EditorInputExtensions, ActiveEditorContext } from 'vs/workBench/common/editor';
import { ExtensionHostProfileService } from 'vs/workBench/contriB/extensions/electron-Browser/extensionProfileService';
import { RuntimeExtensionsInput } from 'vs/workBench/contriB/extensions/electron-Browser/runtimeExtensionsInput';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { ExtensionsAutoProfiler } from 'vs/workBench/contriB/extensions/electron-Browser/extensionsAutoProfiler';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { OpenExtensionsFolderAction } from 'vs/workBench/contriB/extensions/electron-sandBox/extensionsActions';
import { ExtensionsLaBel } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationNotificationService } from 'vs/platform/extensionRecommendations/common/extensionRecommendations';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { ExtensionRecommendationNotificationServiceChannel } from 'vs/platform/extensionRecommendations/electron-sandBox/extensionRecommendationsIpc';

// Singletons
registerSingleton(IExtensionHostProfileService, ExtensionHostProfileService, true);

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(ExtensionsAutoProfiler, LifecyclePhase.Eventually);

// Running Extensions Editor

const runtimeExtensionsEditorDescriptor = EditorDescriptor.create(
	RuntimeExtensionsEditor,
	RuntimeExtensionsEditor.ID,
	localize('runtimeExtension', "Running Extensions")
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors)
	.registerEditor(runtimeExtensionsEditorDescriptor, [new SyncDescriptor(RuntimeExtensionsInput)]);

class RuntimeExtensionsInputFactory implements IEditorInputFactory {
	canSerialize(editorInput: EditorInput): Boolean {
		return true;
	}
	serialize(editorInput: EditorInput): string {
		return '';
	}
	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
		return RuntimeExtensionsInput.instance;
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(RuntimeExtensionsInput.ID, RuntimeExtensionsInputFactory);


// GloBal actions
const actionRegistry = Registry.as<IWorkBenchActionRegistry>(WorkBenchActionExtensions.WorkBenchActions);

actionRegistry.registerWorkBenchAction(SyncActionDescriptor.from(ShowRuntimeExtensionsAction), 'Show Running Extensions', CATEGORIES.Developer.value);

class ExtensionsContriButions implements IWorkBenchContriBution {

	constructor(
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IExtensionRecommendationNotificationService extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@ISharedProcessService sharedProcessService: ISharedProcessService,
	) {
		sharedProcessService.registerChannel('IExtensionRecommendationNotificationService', new ExtensionRecommendationNotificationServiceChannel(extensionRecommendationNotificationService));
		if (environmentService.extensionsPath) {
			const openExtensionsFolderActionDescriptor = SyncActionDescriptor.from(OpenExtensionsFolderAction);
			actionRegistry.registerWorkBenchAction(openExtensionsFolderActionDescriptor, 'Extensions: Open Extensions Folder', ExtensionsLaBel);
		}
	}
}

workBenchRegistry.registerWorkBenchContriBution(ExtensionsContriButions, LifecyclePhase.Starting);

// Register Commands

CommandsRegistry.registerCommand(DeBugExtensionHostAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(DeBugExtensionHostAction).run();
});

CommandsRegistry.registerCommand(StartExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(StartExtensionHostProfileAction, StartExtensionHostProfileAction.ID, StartExtensionHostProfileAction.LABEL).run();
});

CommandsRegistry.registerCommand(StopExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(StopExtensionHostProfileAction, StopExtensionHostProfileAction.ID, StopExtensionHostProfileAction.LABEL).run();
});

CommandsRegistry.registerCommand(SaveExtensionHostProfileAction.ID, (accessor: ServicesAccessor) => {
	const instantiationService = accessor.get(IInstantiationService);
	instantiationService.createInstance(SaveExtensionHostProfileAction, SaveExtensionHostProfileAction.ID, SaveExtensionHostProfileAction.LABEL).run();
});

// Running extensions

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: DeBugExtensionHostAction.ID,
		title: DeBugExtensionHostAction.LABEL,
		icon: {
			id: 'codicon/deBug-start'
		}
	},
	group: 'navigation',
	when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: StartExtensionHostProfileAction.ID,
		title: StartExtensionHostProfileAction.LABEL,
		icon: {
			id: 'codicon/circle-filled'
		}
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running'))
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: StopExtensionHostProfileAction.ID,
		title: StopExtensionHostProfileAction.LABEL,
		icon: {
			id: 'codicon/deBug-stop'
		}
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running'))
});

MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
	command: {
		id: SaveExtensionHostProfileAction.ID,
		title: SaveExtensionHostProfileAction.LABEL,
		icon: {
			id: 'codicon/save-all'
		},
		precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED
	},
	group: 'navigation',
	when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID))
});
