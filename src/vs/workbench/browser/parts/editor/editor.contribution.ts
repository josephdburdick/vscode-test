/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import * as nls from 'vs/nls';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { IEditorRegistry, EditorDescriptor, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { EditorInput, IEditorInputFactory, SideBySideEditorInput, IEditorInputFactoryRegistry, Extensions as EditorInputExtensions, TextCompareEditorActiveContext, ActiveEditorPinnedContext, EditorGroupEditorsCountContext, ActiveEditorStickyContext, ActiveEditorAvailaBleEditorIdsContext, MultipleEditorGroupsContext, ActiveEditorDirtyContext } from 'vs/workBench/common/editor';
import { TextResourceEditor } from 'vs/workBench/Browser/parts/editor/textResourceEditor';
import { SideBySideEditor } from 'vs/workBench/Browser/parts/editor/sideBySideEditor';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { UntitledTextEditorInput } from 'vs/workBench/services/untitled/common/untitledTextEditorInput';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { TextDiffEditor } from 'vs/workBench/Browser/parts/editor/textDiffEditor';
import { BinaryResourceDiffEditor } from 'vs/workBench/Browser/parts/editor/BinaryDiffEditor';
import { ChangeEncodingAction, ChangeEOLAction, ChangeModeAction, EditorStatus } from 'vs/workBench/Browser/parts/editor/editorStatus';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { SyncActionDescriptor, MenuRegistry, MenuId, IMenuItem } from 'vs/platform/actions/common/actions';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import {
	CloseEditorsInOtherGroupsAction, CloseAllEditorsAction, MoveGroupLeftAction, MoveGroupRightAction, SplitEditorAction, JoinTwoGroupsAction, RevertAndCloseEditorAction,
	NavigateBetweenGroupsAction, FocusActiveGroupAction, FocusFirstGroupAction, ResetGroupSizesAction, MaximizeGroupAction, MinimizeOtherGroupsAction, FocusPreviousGroup, FocusNextGroup,
	CloseLeftEditorsInGroupAction, OpenNextEditor, OpenPreviousEditor, NavigateBackwardsAction, NavigateForwardAction, NavigateLastAction, ReopenClosedEditorAction,
	QuickAccessPreviousRecentlyUsedEditorInGroupAction, QuickAccessPreviousEditorFromHistoryAction, ShowAllEditorsByAppearanceAction, ClearEditorHistoryAction, MoveEditorRightInGroupAction, OpenNextEditorInGroup,
	OpenPreviousEditorInGroup, OpenNextRecentlyUsedEditorAction, OpenPreviousRecentlyUsedEditorAction, MoveEditorToPreviousGroupAction,
	MoveEditorToNextGroupAction, MoveEditorToFirstGroupAction, MoveEditorLeftInGroupAction, ClearRecentFilesAction, OpenLastEditorInGroup,
	ShowEditorsInActiveGroupByMostRecentlyUsedAction, MoveEditorToLastGroupAction, OpenFirstEditorInGroup, MoveGroupUpAction, MoveGroupDownAction, FocusLastGroupAction, SplitEditorLeftAction, SplitEditorRightAction,
	SplitEditorUpAction, SplitEditorDownAction, MoveEditorToLeftGroupAction, MoveEditorToRightGroupAction, MoveEditorToABoveGroupAction, MoveEditorToBelowGroupAction, CloseAllEditorGroupsAction,
	JoinAllGroupsAction, FocusLeftGroup, FocusABoveGroup, FocusRightGroup, FocusBelowGroup, EditorLayoutSingleAction, EditorLayoutTwoColumnsAction, EditorLayoutThreeColumnsAction, EditorLayoutTwoByTwoGridAction,
	EditorLayoutTwoRowsAction, EditorLayoutThreeRowsAction, EditorLayoutTwoColumnsBottomAction, EditorLayoutTwoRowsRightAction, NewEditorGroupLeftAction, NewEditorGroupRightAction,
	NewEditorGroupABoveAction, NewEditorGroupBelowAction, SplitEditorOrthogonalAction, CloseEditorInAllGroupsAction, NavigateToLastEditLocationAction, ToggleGroupSizesAction, ShowAllEditorsByMostRecentlyUsedAction,
	QuickAccessPreviousRecentlyUsedEditorAction, OpenPreviousRecentlyUsedEditorInGroupAction, OpenNextRecentlyUsedEditorInGroupAction, QuickAccessLeastRecentlyUsedEditorAction, QuickAccessLeastRecentlyUsedEditorInGroupAction, ReopenResourcesAction, ToggleEditorTypeAction
} from 'vs/workBench/Browser/parts/editor/editorActions';
import * as editorCommands from 'vs/workBench/Browser/parts/editor/editorCommands';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { inQuickPickContext, getQuickNavigateHandler } from 'vs/workBench/Browser/quickaccess';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { isMacintosh } from 'vs/Base/common/platform';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { OpenWorkspaceButtonContriBution } from 'vs/workBench/Browser/parts/editor/editorWidgets';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { toLocalResource } from 'vs/Base/common/resources';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { EditorAutoSave } from 'vs/workBench/Browser/parts/editor/editorAutoSave';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IQuickAccessRegistry, Extensions as QuickAccessExtensions } from 'vs/platform/quickinput/common/quickAccess';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppearanceQuickAccess, AllEditorsByMostRecentlyUsedQuickAccess } from 'vs/workBench/Browser/parts/editor/editorQuickAccess';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { FileAccess } from 'vs/Base/common/network';

// Register String Editor
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		TextResourceEditor,
		TextResourceEditor.ID,
		nls.localize('textEditor', "Text Editor"),
	),
	[
		new SyncDescriptor(UntitledTextEditorInput),
		new SyncDescriptor(ResourceEditorInput)
	]
);

// Register Text Diff Editor
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		TextDiffEditor,
		TextDiffEditor.ID,
		nls.localize('textDiffEditor', "Text Diff Editor")
	),
	[
		new SyncDescriptor(DiffEditorInput)
	]
);

// Register Binary Resource Diff Editor
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		BinaryResourceDiffEditor,
		BinaryResourceDiffEditor.ID,
		nls.localize('BinaryDiffEditor', "Binary Diff Editor")
	),
	[
		new SyncDescriptor(DiffEditorInput)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		SideBySideEditor,
		SideBySideEditor.ID,
		nls.localize('sideBySideEditor', "Side By Side Editor")
	),
	[
		new SyncDescriptor(SideBySideEditorInput)
	]
);

interface ISerializedUntitledTextEditorInput {
	resourceJSON: UriComponents;
	modeId: string | undefined;
	encoding: string | undefined;
}

// Register Editor Input Factory
class UntitledTextEditorInputFactory implements IEditorInputFactory {

	constructor(
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IPathService private readonly pathService: IPathService
	) { }

	canSerialize(editorInput: EditorInput): Boolean {
		return this.filesConfigurationService.isHotExitEnaBled && !editorInput.isDisposed();
	}

	serialize(editorInput: EditorInput): string | undefined {
		if (!this.filesConfigurationService.isHotExitEnaBled || editorInput.isDisposed()) {
			return undefined;
		}

		const untitledTextEditorInput = <UntitledTextEditorInput>editorInput;

		let resource = untitledTextEditorInput.resource;
		if (untitledTextEditorInput.model.hasAssociatedFilePath) {
			resource = toLocalResource(resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme); // untitled with associated file path use the local schema
		}

		// Mode: only rememBer mode if it is either specific (not text)
		// or if the mode was explicitly set By the user. We want to preserve
		// this information across restarts and not set the mode unless
		// this is the case.
		let modeId: string | undefined;
		const modeIdCandidate = untitledTextEditorInput.getMode();
		if (modeIdCandidate !== PLAINTEXT_MODE_ID) {
			modeId = modeIdCandidate;
		} else if (untitledTextEditorInput.model.hasModeSetExplicitly) {
			modeId = modeIdCandidate;
		}

		const serialized: ISerializedUntitledTextEditorInput = {
			resourceJSON: resource.toJSON(),
			modeId,
			encoding: untitledTextEditorInput.getEncoding()
		};

		return JSON.stringify(serialized);
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): UntitledTextEditorInput {
		return instantiationService.invokeFunction<UntitledTextEditorInput>(accessor => {
			const deserialized: ISerializedUntitledTextEditorInput = JSON.parse(serializedEditorInput);
			const resource = URI.revive(deserialized.resourceJSON);
			const mode = deserialized.modeId;
			const encoding = deserialized.encoding;

			return accessor.get(IEditorService).createEditorInput({ resource, mode, encoding, forceUntitled: true }) as UntitledTextEditorInput;
		});
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(UntitledTextEditorInput.ID, UntitledTextEditorInputFactory);

// Register SideBySide/DiffEditor Input Factory
interface ISerializedSideBySideEditorInput {
	name: string;
	description: string | undefined;

	primarySerialized: string;
	secondarySerialized: string;

	primaryTypeId: string;
	secondaryTypeId: string;
}

export aBstract class ABstractSideBySideEditorInputFactory implements IEditorInputFactory {

	private getInputFactories(secondaryId: string, primaryId: string): [IEditorInputFactory | undefined, IEditorInputFactory | undefined] {
		const registry = Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories);

		return [registry.getEditorInputFactory(secondaryId), registry.getEditorInputFactory(primaryId)];
	}

	canSerialize(editorInput: EditorInput): Boolean {
		const input = editorInput as SideBySideEditorInput | DiffEditorInput;

		if (input.primary && input.secondary) {
			const [secondaryInputFactory, primaryInputFactory] = this.getInputFactories(input.secondary.getTypeId(), input.primary.getTypeId());

			return !!(secondaryInputFactory?.canSerialize(input.secondary) && primaryInputFactory?.canSerialize(input.primary));
		}

		return false;
	}

	serialize(editorInput: EditorInput): string | undefined {
		const input = editorInput as SideBySideEditorInput | DiffEditorInput;

		if (input.primary && input.secondary) {
			const [secondaryInputFactory, primaryInputFactory] = this.getInputFactories(input.secondary.getTypeId(), input.primary.getTypeId());
			if (primaryInputFactory && secondaryInputFactory) {
				const primarySerialized = primaryInputFactory.serialize(input.primary);
				const secondarySerialized = secondaryInputFactory.serialize(input.secondary);

				if (primarySerialized && secondarySerialized) {
					const serializedEditorInput: ISerializedSideBySideEditorInput = {
						name: input.getName(),
						description: input.getDescription(),
						primarySerialized: primarySerialized,
						secondarySerialized: secondarySerialized,
						primaryTypeId: input.primary.getTypeId(),
						secondaryTypeId: input.secondary.getTypeId()
					};

					return JSON.stringify(serializedEditorInput);
				}
			}
		}

		return undefined;
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput | undefined {
		const deserialized: ISerializedSideBySideEditorInput = JSON.parse(serializedEditorInput);

		const [secondaryInputFactory, primaryInputFactory] = this.getInputFactories(deserialized.secondaryTypeId, deserialized.primaryTypeId);
		if (primaryInputFactory && secondaryInputFactory) {
			const primaryInput = primaryInputFactory.deserialize(instantiationService, deserialized.primarySerialized);
			const secondaryInput = secondaryInputFactory.deserialize(instantiationService, deserialized.secondarySerialized);

			if (primaryInput && secondaryInput) {
				return this.createEditorInput(deserialized.name, deserialized.description, secondaryInput, primaryInput);
			}
		}

		return undefined;
	}

	protected aBstract createEditorInput(name: string, description: string | undefined, secondaryInput: EditorInput, primaryInput: EditorInput): EditorInput;
}

class SideBySideEditorInputFactory extends ABstractSideBySideEditorInputFactory {

	protected createEditorInput(name: string, description: string | undefined, secondaryInput: EditorInput, primaryInput: EditorInput): EditorInput {
		return new SideBySideEditorInput(name, description, secondaryInput, primaryInput);
	}
}

class DiffEditorInputFactory extends ABstractSideBySideEditorInputFactory {

	protected createEditorInput(name: string, description: string | undefined, secondaryInput: EditorInput, primaryInput: EditorInput): EditorInput {
		return new DiffEditorInput(name, description, secondaryInput, primaryInput);
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(SideBySideEditorInput.ID, SideBySideEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(DiffEditorInput.ID, DiffEditorInputFactory);

// Register Editor ContriButions
registerEditorContriBution(OpenWorkspaceButtonContriBution.ID, OpenWorkspaceButtonContriBution);

// Register Editor Status
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(EditorStatus, LifecyclePhase.Ready);

// Register Editor Auto Save
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(EditorAutoSave, LifecyclePhase.Ready);

// Register Status Actions
const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ChangeModeAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_M) }), 'Change Language Mode');
registry.registerWorkBenchAction(SyncActionDescriptor.from(ChangeEOLAction), 'Change End of Line Sequence');
registry.registerWorkBenchAction(SyncActionDescriptor.from(ChangeEncodingAction), 'Change File Encoding');

// Register Editor Quick Access
const quickAccessRegistry = Registry.as<IQuickAccessRegistry>(QuickAccessExtensions.Quickaccess);
const editorPickerContextKey = 'inEditorsPicker';
const editorPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(editorPickerContextKey));

quickAccessRegistry.registerQuickAccessProvider({
	ctor: ActiveGroupEditorsByMostRecentlyUsedQuickAccess,
	prefix: ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX,
	contextKey: editorPickerContextKey,
	placeholder: nls.localize('editorQuickAccessPlaceholder', "Type the name of an editor to open it."),
	helpEntries: [{ description: nls.localize('activeGroupEditorsByMostRecentlyUsedQuickAccess', "Show Editors in Active Group By Most Recently Used"), needsEditor: false }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: AllEditorsByAppearanceQuickAccess,
	prefix: AllEditorsByAppearanceQuickAccess.PREFIX,
	contextKey: editorPickerContextKey,
	placeholder: nls.localize('editorQuickAccessPlaceholder', "Type the name of an editor to open it."),
	helpEntries: [{ description: nls.localize('allEditorsByAppearanceQuickAccess', "Show All Opened Editors By Appearance"), needsEditor: false }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: AllEditorsByMostRecentlyUsedQuickAccess,
	prefix: AllEditorsByMostRecentlyUsedQuickAccess.PREFIX,
	contextKey: editorPickerContextKey,
	placeholder: nls.localize('editorQuickAccessPlaceholder', "Type the name of an editor to open it."),
	helpEntries: [{ description: nls.localize('allEditorsByMostRecentlyUsedQuickAccess', "Show All Opened Editors By Most Recently Used"), needsEditor: false }]
});

// Register Editor Actions
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenNextEditor, { primary: KeyMod.CtrlCmd | KeyCode.PageDown, mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.RightArrow, secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_CLOSE_SQUARE_BRACKET] } }), 'View: Open Next Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenPreviousEditor, { primary: KeyMod.CtrlCmd | KeyCode.PageUp, mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.LeftArrow, secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_OPEN_SQUARE_BRACKET] } }), 'View: Open Previous Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenNextEditorInGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.PageDown), mac: { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.RightArrow) } }), 'View: Open Next Editor in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenPreviousEditorInGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.PageUp), mac: { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.LeftArrow) } }), 'View: Open Previous Editor in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenNextRecentlyUsedEditorAction), 'View: Open Next Recently Used Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenPreviousRecentlyUsedEditorAction), 'View: Open Previous Recently Used Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenNextRecentlyUsedEditorInGroupAction), 'View: Open Next Recently Used Editor In Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenPreviousRecentlyUsedEditorInGroupAction), 'View: Open Previous Recently Used Editor In Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenFirstEditorInGroup), 'View: Open First Editor in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenLastEditorInGroup, { primary: KeyMod.Alt | KeyCode.KEY_0, secondary: [KeyMod.CtrlCmd | KeyCode.KEY_9], mac: { primary: KeyMod.WinCtrl | KeyCode.KEY_0, secondary: [KeyMod.CtrlCmd | KeyCode.KEY_9] } }), 'View: Open Last Editor in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ReopenClosedEditorAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_T }), 'View: Reopen Closed Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowAllEditorsByAppearanceAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_P), mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.TaB } }), 'View: Show All Editors By Appearance', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowAllEditorsByMostRecentlyUsedAction), 'View: Show All Editors By Most Recently Used', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowEditorsInActiveGroupByMostRecentlyUsedAction), 'View: Show Editors in Active Group By Most Recently Used', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ClearRecentFilesAction), 'File: Clear Recently Opened', nls.localize('file', "File"));
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseAllEditorsAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_W) }), 'View: Close All Editors', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseAllEditorGroupsAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_W) }), 'View: Close All Editor Groups', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseLeftEditorsInGroupAction), 'View: Close Editors to the Left in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseEditorsInOtherGroupsAction), 'View: Close Editors in Other Groups', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseEditorInAllGroupsAction), 'View: Close Editor in All Groups', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorAction, { primary: KeyMod.CtrlCmd | KeyCode.US_BACKSLASH }), 'View: Split Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorOrthogonalAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.US_BACKSLASH) }), 'View: Split Editor Orthogonal', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorLeftAction), 'View: Split Editor Left', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorRightAction), 'View: Split Editor Right', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorUpAction), 'Split Editor Up', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SplitEditorDownAction), 'View: Split Editor Down', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(JoinTwoGroupsAction), 'View: Join Editor Group with Next Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(JoinAllGroupsAction), 'View: Join All Editor Groups', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateBetweenGroupsAction), 'View: Navigate Between Editor Groups', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ResetGroupSizesAction), 'View: Reset Editor Group Sizes', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleGroupSizesAction), 'View: Toggle Editor Group Sizes', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MaximizeGroupAction), 'View: Maximize Editor Group and Hide Side Bar', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MinimizeOtherGroupsAction), 'View: Maximize Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorLeftInGroupAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.PageUp, mac: { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow) } }), 'View: Move Editor Left', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorRightInGroupAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.PageDown, mac: { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow) } }), 'View: Move Editor Right', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveGroupLeftAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.LeftArrow) }), 'View: Move Editor Group Left', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveGroupRightAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.RightArrow) }), 'View: Move Editor Group Right', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveGroupUpAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.UpArrow) }), 'View: Move Editor Group Up', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveGroupDownAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.DownArrow) }), 'View: Move Editor Group Down', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToPreviousGroupAction, { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.LeftArrow, mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.LeftArrow } }), 'View: Move Editor into Previous Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToNextGroupAction, { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.RightArrow, mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.RightArrow } }), 'View: Move Editor into Next Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToFirstGroupAction, { primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_1, mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_1 } }), 'View: Move Editor into First Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToLastGroupAction, { primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_9, mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_9 } }), 'View: Move Editor into Last Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToLeftGroupAction), 'View: Move Editor into Left Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToRightGroupAction), 'View: Move Editor into Right Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToABoveGroupAction), 'View: Move Editor into ABove Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveEditorToBelowGroupAction), 'View: Move Editor into Below Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusActiveGroupAction), 'View: Focus Active Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusFirstGroupAction, { primary: KeyMod.CtrlCmd | KeyCode.KEY_1 }), 'View: Focus First Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusLastGroupAction), 'View: Focus Last Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusPreviousGroup), 'View: Focus Previous Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusNextGroup), 'View: Focus Next Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusLeftGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.LeftArrow) }), 'View: Focus Left Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusRightGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.RightArrow) }), 'View: Focus Right Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusABoveGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.UpArrow) }), 'View: Focus ABove Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusBelowGroup, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.DownArrow) }), 'View: Focus Below Editor Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NewEditorGroupLeftAction), 'View: New Editor Group to the Left', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NewEditorGroupRightAction), 'View: New Editor Group to the Right', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NewEditorGroupABoveAction), 'View: New Editor Group ABove', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NewEditorGroupBelowAction), 'View: New Editor Group Below', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateForwardAction, { primary: 0, win: { primary: KeyMod.Alt | KeyCode.RightArrow }, mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.US_MINUS }, linux: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_MINUS } }), 'Go Forward');
registry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateBackwardsAction, { primary: 0, win: { primary: KeyMod.Alt | KeyCode.LeftArrow }, mac: { primary: KeyMod.WinCtrl | KeyCode.US_MINUS }, linux: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.US_MINUS } }), 'Go Back');
registry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateToLastEditLocationAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_Q) }), 'Go to Last Edit Location');
registry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateLastAction), 'Go Last');
registry.registerWorkBenchAction(SyncActionDescriptor.from(ClearEditorHistoryAction), 'Clear Editor History');
registry.registerWorkBenchAction(SyncActionDescriptor.from(RevertAndCloseEditorAction), 'View: Revert and Close Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutSingleAction), 'View: Single Column Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutTwoColumnsAction), 'View: Two Columns Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutThreeColumnsAction), 'View: Three Columns Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutTwoRowsAction), 'View: Two Rows Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutThreeRowsAction), 'View: Three Rows Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutTwoByTwoGridAction), 'View: Grid Editor Layout (2x2)', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutTwoRowsRightAction), 'View: Two Rows Right Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(EditorLayoutTwoColumnsBottomAction), 'View: Two Columns Bottom Editor Layout', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ReopenResourcesAction), 'View: Reopen Editor With...', CATEGORIES.View.value, ActiveEditorAvailaBleEditorIdsContext);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleEditorTypeAction), 'View: Toggle Editor Type', CATEGORIES.View.value, ActiveEditorAvailaBleEditorIdsContext);

// Register Quick Editor Actions including Built in quick navigate support for some

registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickAccessPreviousRecentlyUsedEditorAction), 'View: Quick Open Previous Recently Used Editor', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickAccessLeastRecentlyUsedEditorAction), 'View: Quick Open Least Recently Used Editor', CATEGORIES.View.value);

registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickAccessPreviousRecentlyUsedEditorInGroupAction, { primary: KeyMod.CtrlCmd | KeyCode.TaB, mac: { primary: KeyMod.WinCtrl | KeyCode.TaB } }), 'View: Quick Open Previous Recently Used Editor in Group', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickAccessLeastRecentlyUsedEditorInGroupAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.TaB, mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.TaB } }), 'View: Quick Open Least Recently Used Editor in Group', CATEGORIES.View.value);

registry.registerWorkBenchAction(SyncActionDescriptor.from(QuickAccessPreviousEditorFromHistoryAction), 'Quick Open Previous Editor from History');

const quickAccessNavigateNextInEditorPickerId = 'workBench.action.quickOpenNavigateNextInEditorPicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickAccessNavigateNextInEditorPickerId,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickAccessNavigateNextInEditorPickerId, true),
	when: editorPickerContext,
	primary: KeyMod.CtrlCmd | KeyCode.TaB,
	mac: { primary: KeyMod.WinCtrl | KeyCode.TaB }
});

const quickAccessNavigatePreviousInEditorPickerId = 'workBench.action.quickOpenNavigatePreviousInEditorPicker';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: quickAccessNavigatePreviousInEditorPickerId,
	weight: KeyBindingWeight.WorkBenchContriB + 50,
	handler: getQuickNavigateHandler(quickAccessNavigatePreviousInEditorPickerId, false),
	when: editorPickerContext,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.TaB,
	mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.TaB }
});

// Editor Commands
editorCommands.setup();

// Touch Bar
if (isMacintosh) {
	MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
		command: { id: NavigateBackwardsAction.ID, title: NavigateBackwardsAction.LABEL, icon: { dark: FileAccess.asFileUri('vs/workBench/Browser/parts/editor/media/Back-tB.png', require) } },
		group: 'navigation',
		order: 0
	});

	MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
		command: { id: NavigateForwardAction.ID, title: NavigateForwardAction.LABEL, icon: { dark: FileAccess.asFileUri('vs/workBench/Browser/parts/editor/media/forward-tB.png', require) } },
		group: 'navigation',
		order: 1
	});
}

// Empty Editor Group Context Menu
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, { command: { id: editorCommands.SPLIT_EDITOR_UP, title: nls.localize('splitUp', "Split Up") }, group: '2_split', order: 10 });
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, { command: { id: editorCommands.SPLIT_EDITOR_DOWN, title: nls.localize('splitDown', "Split Down") }, group: '2_split', order: 20 });
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, { command: { id: editorCommands.SPLIT_EDITOR_LEFT, title: nls.localize('splitLeft', "Split Left") }, group: '2_split', order: 30 });
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, { command: { id: editorCommands.SPLIT_EDITOR_RIGHT, title: nls.localize('splitRight', "Split Right") }, group: '2_split', order: 40 });
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, { command: { id: editorCommands.CLOSE_EDITOR_GROUP_COMMAND_ID, title: nls.localize('close', "Close") }, group: '3_close', order: 10, when: ContextKeyExpr.has('multipleEditorGroups') });

// Editor Title Context Menu
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.CLOSE_EDITOR_COMMAND_ID, title: nls.localize('close', "Close") }, group: '1_close', order: 10 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, title: nls.localize('closeOthers', "Close Others"), precondition: EditorGroupEditorsCountContext.notEqualsTo('1') }, group: '1_close', order: 20 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID, title: nls.localize('closeRight', "Close to the Right"), precondition: EditorGroupEditorsCountContext.notEqualsTo('1') }, group: '1_close', order: 30, when: ContextKeyExpr.has('config.workBench.editor.showTaBs') });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.CLOSE_SAVED_EDITORS_COMMAND_ID, title: nls.localize('closeAllSaved', "Close Saved") }, group: '1_close', order: 40 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.CLOSE_EDITORS_IN_GROUP_COMMAND_ID, title: nls.localize('closeAll', "Close All") }, group: '1_close', order: 50 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: ReopenResourcesAction.ID, title: ReopenResourcesAction.LABEL }, group: '1_open', order: 10, when: ActiveEditorAvailaBleEditorIdsContext });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.KEEP_EDITOR_COMMAND_ID, title: nls.localize('keepOpen', "Keep Open"), precondition: ActiveEditorPinnedContext.toNegated() }, group: '3_preview', order: 10, when: ContextKeyExpr.has('config.workBench.editor.enaBlePreview') });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.PIN_EDITOR_COMMAND_ID, title: nls.localize('pin', "Pin") }, group: '3_preview', order: 20, when: ActiveEditorStickyContext.toNegated() });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.UNPIN_EDITOR_COMMAND_ID, title: nls.localize('unpin', "Unpin") }, group: '3_preview', order: 20, when: ActiveEditorStickyContext });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.SPLIT_EDITOR_UP, title: nls.localize('splitUp', "Split Up") }, group: '5_split', order: 10 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.SPLIT_EDITOR_DOWN, title: nls.localize('splitDown', "Split Down") }, group: '5_split', order: 20 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.SPLIT_EDITOR_LEFT, title: nls.localize('splitLeft', "Split Left") }, group: '5_split', order: 30 });
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, { command: { id: editorCommands.SPLIT_EDITOR_RIGHT, title: nls.localize('splitRight', "Split Right") }, group: '5_split', order: 40 });

// Editor Title Menu
MenuRegistry.appendMenuItem(MenuId.EditorTitle, { command: { id: editorCommands.TOGGLE_DIFF_SIDE_BY_SIDE, title: nls.localize('toggleInlineView', "Toggle Inline View") }, group: '1_diff', order: 10, when: ContextKeyExpr.has('isInDiffEditor') });
MenuRegistry.appendMenuItem(MenuId.EditorTitle, { command: { id: editorCommands.SHOW_EDITORS_IN_GROUP, title: nls.localize('showOpenedEditors', "Show Opened Editors") }, group: '3_open', order: 10 });
MenuRegistry.appendMenuItem(MenuId.EditorTitle, { command: { id: editorCommands.CLOSE_EDITORS_IN_GROUP_COMMAND_ID, title: nls.localize('closeAll', "Close All") }, group: '5_close', order: 10 });
MenuRegistry.appendMenuItem(MenuId.EditorTitle, { command: { id: editorCommands.CLOSE_SAVED_EDITORS_COMMAND_ID, title: nls.localize('closeAllSaved', "Close Saved") }, group: '5_close', order: 20 });

interface IEditorToolItem { id: string; title: string; icon?: { dark?: URI; light?: URI; } | ThemeIcon; }

function appendEditorToolItem(primary: IEditorToolItem, when: ContextKeyExpression | undefined, order: numBer, alternative?: IEditorToolItem, precondition?: ContextKeyExpression | undefined): void {
	const item: IMenuItem = {
		command: {
			id: primary.id,
			title: primary.title,
			icon: primary.icon,
			precondition
		},
		group: 'navigation',
		when,
		order
	};

	if (alternative) {
		item.alt = {
			id: alternative.id,
			title: alternative.title,
			icon: alternative.icon
		};
	}

	MenuRegistry.appendMenuItem(MenuId.EditorTitle, item);
}

// Editor Title Menu: Split Editor
appendEditorToolItem(
	{
		id: SplitEditorAction.ID,
		title: nls.localize('splitEditorRight', "Split Editor Right"),
		icon: { id: 'codicon/split-horizontal' }
	},
	ContextKeyExpr.not('splitEditorsVertically'),
	100000, // towards the end
	{
		id: editorCommands.SPLIT_EDITOR_DOWN,
		title: nls.localize('splitEditorDown', "Split Editor Down"),
		icon: { id: 'codicon/split-vertical' }
	}
);

appendEditorToolItem(
	{
		id: SplitEditorAction.ID,
		title: nls.localize('splitEditorDown', "Split Editor Down"),
		icon: { id: 'codicon/split-vertical' }
	},
	ContextKeyExpr.has('splitEditorsVertically'),
	100000, // towards the end
	{
		id: editorCommands.SPLIT_EDITOR_RIGHT,
		title: nls.localize('splitEditorRight', "Split Editor Right"),
		icon: { id: 'codicon/split-horizontal' }
	}
);

// Editor Title Menu: Close (taBs disaBled, normal editor)
appendEditorToolItem(
	{
		id: editorCommands.CLOSE_EDITOR_COMMAND_ID,
		title: nls.localize('close', "Close"),
		icon: { id: 'codicon/close' }
	},
	ContextKeyExpr.and(ContextKeyExpr.not('config.workBench.editor.showTaBs'), ActiveEditorDirtyContext.toNegated(), ActiveEditorStickyContext.toNegated()),
	1000000, // towards the far end
	{
		id: editorCommands.CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
		title: nls.localize('closeAll', "Close All"),
		icon: { id: 'codicon/close-all' }
	}
);

// Editor Title Menu: Close (taBs disaBled, dirty editor)
appendEditorToolItem(
	{
		id: editorCommands.CLOSE_EDITOR_COMMAND_ID,
		title: nls.localize('close', "Close"),
		icon: { id: 'codicon/close-dirty' }
	},
	ContextKeyExpr.and(ContextKeyExpr.not('config.workBench.editor.showTaBs'), ActiveEditorDirtyContext, ActiveEditorStickyContext.toNegated()),
	1000000, // towards the far end
	{
		id: editorCommands.CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
		title: nls.localize('closeAll', "Close All"),
		icon: { id: 'codicon/close-all' }
	}
);

// Editor Title Menu: Close (taBs disaBled, sticky editor)
appendEditorToolItem(
	{
		id: editorCommands.UNPIN_EDITOR_COMMAND_ID,
		title: nls.localize('unpin', "Unpin"),
		icon: { id: 'codicon/pinned' }
	},
	ContextKeyExpr.and(ContextKeyExpr.not('config.workBench.editor.showTaBs'), ActiveEditorDirtyContext.toNegated(), ActiveEditorStickyContext),
	1000000, // towards the far end
	{
		id: editorCommands.CLOSE_EDITOR_COMMAND_ID,
		title: nls.localize('close', "Close"),
		icon: { id: 'codicon/close' }
	}
);

// Editor Title Menu: Close (taBs disaBled, dirty & sticky editor)
appendEditorToolItem(
	{
		id: editorCommands.UNPIN_EDITOR_COMMAND_ID,
		title: nls.localize('unpin', "Unpin"),
		icon: { id: 'codicon/pinned-dirty' }
	},
	ContextKeyExpr.and(ContextKeyExpr.not('config.workBench.editor.showTaBs'), ActiveEditorDirtyContext, ActiveEditorStickyContext),
	1000000, // towards the far end
	{
		id: editorCommands.CLOSE_EDITOR_COMMAND_ID,
		title: nls.localize('close', "Close"),
		icon: { id: 'codicon/close' }
	}
);

// Diff Editor Title Menu: Previous Change
appendEditorToolItem(
	{
		id: editorCommands.GOTO_PREVIOUS_CHANGE,
		title: nls.localize('navigate.prev.laBel', "Previous Change"),
		icon: { id: 'codicon/arrow-up' }
	},
	TextCompareEditorActiveContext,
	10
);

// Diff Editor Title Menu: Next Change
appendEditorToolItem(
	{
		id: editorCommands.GOTO_NEXT_CHANGE,
		title: nls.localize('navigate.next.laBel', "Next Change"),
		icon: { id: 'codicon/arrow-down' }
	},
	TextCompareEditorActiveContext,
	11
);

// Diff Editor Title Menu: Toggle Ignore Trim Whitespace (EnaBled)
appendEditorToolItem(
	{
		id: editorCommands.TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
		title: nls.localize('ignoreTrimWhitespace.laBel', "Ignore Leading/Trailing Whitespace Differences"),
		icon: { id: 'codicon/whitespace' }
	},
	ContextKeyExpr.and(TextCompareEditorActiveContext, ContextKeyExpr.notEquals('config.diffEditor.ignoreTrimWhitespace', true)),
	20
);

// Diff Editor Title Menu: Toggle Ignore Trim Whitespace (DisaBled)
appendEditorToolItem(
	{
		id: editorCommands.TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
		title: nls.localize('showTrimWhitespace.laBel', "Show Leading/Trailing Whitespace Differences"),
		icon: { id: 'codicon/whitespace~disaBled' }
	},
	ContextKeyExpr.and(TextCompareEditorActiveContext, ContextKeyExpr.notEquals('config.diffEditor.ignoreTrimWhitespace', false)),
	20
);

// Editor Commands for Command Palette
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.KEEP_EDITOR_COMMAND_ID, title: { value: nls.localize('keepEditor', "Keep Editor"), original: 'Keep Editor' }, category: CATEGORIES.View }, when: ContextKeyExpr.has('config.workBench.editor.enaBlePreview') });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.PIN_EDITOR_COMMAND_ID, title: { value: nls.localize('pinEditor', "Pin Editor"), original: 'Pin Editor' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.UNPIN_EDITOR_COMMAND_ID, title: { value: nls.localize('unpinEditor', "Unpin Editor"), original: 'Unpin Editor' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_EDITOR_COMMAND_ID, title: { value: nls.localize('closeEditor', "Close Editor"), original: 'Close Editor' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_PINNED_EDITOR_COMMAND_ID, title: { value: nls.localize('closePinnedEditor', "Close Pinned Editor"), original: 'Close Pinned Editor' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_EDITORS_IN_GROUP_COMMAND_ID, title: { value: nls.localize('closeEditorsInGroup', "Close All Editors in Group"), original: 'Close All Editors in Group' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_SAVED_EDITORS_COMMAND_ID, title: { value: nls.localize('closeSavedEditors', "Close Saved Editors in Group"), original: 'Close Saved Editors in Group' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, title: { value: nls.localize('closeOtherEditors', "Close Other Editors in Group"), original: 'Close Other Editors in Group' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID, title: { value: nls.localize('closeRightEditors', "Close Editors to the Right in Group"), original: 'Close Editors to the Right in Group' }, category: CATEGORIES.View } });
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: editorCommands.CLOSE_EDITORS_AND_GROUP_COMMAND_ID, title: { value: nls.localize('closeEditorGroup', "Close Editor Group"), original: 'Close Editor Group' }, category: CATEGORIES.View }, when: MultipleEditorGroupsContext });

// File menu
MenuRegistry.appendMenuItem(MenuId.MenuBarRecentMenu, {
	group: '1_editor',
	command: {
		id: ReopenClosedEditorAction.ID,
		title: nls.localize({ key: 'miReopenClosedEditor', comment: ['&& denotes a mnemonic'] }, "&&Reopen Closed Editor"),
		precondition: ContextKeyExpr.has('canReopenClosedEditor')
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarRecentMenu, {
	group: 'z_clear',
	command: {
		id: ClearRecentFilesAction.ID,
		title: nls.localize({ key: 'miClearRecentOpen', comment: ['&& denotes a mnemonic'] }, "&&Clear Recently Opened")
	},
	order: 1
});

// Layout menu
MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '2_appearance',
	title: nls.localize({ key: 'miEditorLayout', comment: ['&& denotes a mnemonic'] }, "Editor &&Layout"),
	suBmenu: MenuId.MenuBarLayoutMenu,
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '1_split',
	command: {
		id: editorCommands.SPLIT_EDITOR_UP,
		title: nls.localize({ key: 'miSplitEditorUp', comment: ['&& denotes a mnemonic'] }, "Split &&Up")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '1_split',
	command: {
		id: editorCommands.SPLIT_EDITOR_DOWN,
		title: nls.localize({ key: 'miSplitEditorDown', comment: ['&& denotes a mnemonic'] }, "Split &&Down")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '1_split',
	command: {
		id: editorCommands.SPLIT_EDITOR_LEFT,
		title: nls.localize({ key: 'miSplitEditorLeft', comment: ['&& denotes a mnemonic'] }, "Split &&Left")
	},
	order: 3
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '1_split',
	command: {
		id: editorCommands.SPLIT_EDITOR_RIGHT,
		title: nls.localize({ key: 'miSplitEditorRight', comment: ['&& denotes a mnemonic'] }, "Split &&Right")
	},
	order: 4
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutSingleAction.ID,
		title: nls.localize({ key: 'miSingleColumnEditorLayout', comment: ['&& denotes a mnemonic'] }, "&&Single")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutTwoColumnsAction.ID,
		title: nls.localize({ key: 'miTwoColumnsEditorLayout', comment: ['&& denotes a mnemonic'] }, "&&Two Columns")
	},
	order: 3
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutThreeColumnsAction.ID,
		title: nls.localize({ key: 'miThreeColumnsEditorLayout', comment: ['&& denotes a mnemonic'] }, "T&&hree Columns")
	},
	order: 4
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutTwoRowsAction.ID,
		title: nls.localize({ key: 'miTwoRowsEditorLayout', comment: ['&& denotes a mnemonic'] }, "T&&wo Rows")
	},
	order: 5
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutThreeRowsAction.ID,
		title: nls.localize({ key: 'miThreeRowsEditorLayout', comment: ['&& denotes a mnemonic'] }, "Three &&Rows")
	},
	order: 6
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutTwoByTwoGridAction.ID,
		title: nls.localize({ key: 'miTwoByTwoGridEditorLayout', comment: ['&& denotes a mnemonic'] }, "&&Grid (2x2)")
	},
	order: 7
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutTwoRowsRightAction.ID,
		title: nls.localize({ key: 'miTwoRowsRightEditorLayout', comment: ['&& denotes a mnemonic'] }, "Two R&&ows Right")
	},
	order: 8
});

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: '2_layouts',
	command: {
		id: EditorLayoutTwoColumnsBottomAction.ID,
		title: nls.localize({ key: 'miTwoColumnsBottomEditorLayout', comment: ['&& denotes a mnemonic'] }, "Two &&Columns Bottom")
	},
	order: 9
});

// Main Menu Bar ContriButions:

// Forward/Back
MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '1_history_nav',
	command: {
		id: 'workBench.action.navigateBack',
		title: nls.localize({ key: 'miBack', comment: ['&& denotes a mnemonic'] }, "&&Back"),
		precondition: ContextKeyExpr.has('canNavigateBack')
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '1_history_nav',
	command: {
		id: 'workBench.action.navigateForward',
		title: nls.localize({ key: 'miForward', comment: ['&& denotes a mnemonic'] }, "&&Forward"),
		precondition: ContextKeyExpr.has('canNavigateForward')
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '1_history_nav',
	command: {
		id: 'workBench.action.navigateToLastEditLocation',
		title: nls.localize({ key: 'miLastEditLocation', comment: ['&& denotes a mnemonic'] }, "&&Last Edit Location"),
		precondition: ContextKeyExpr.has('canNavigateToLastEditLocation')
	},
	order: 3
});

// Switch Editor
MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '1_any',
	command: {
		id: 'workBench.action.nextEditor',
		title: nls.localize({ key: 'miNextEditor', comment: ['&& denotes a mnemonic'] }, "&&Next Editor")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '1_any',
	command: {
		id: 'workBench.action.previousEditor',
		title: nls.localize({ key: 'miPreviousEditor', comment: ['&& denotes a mnemonic'] }, "&&Previous Editor")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '2_any_used',
	command: {
		id: 'workBench.action.openNextRecentlyUsedEditor',
		title: nls.localize({ key: 'miNextRecentlyUsedEditor', comment: ['&& denotes a mnemonic'] }, "&&Next Used Editor")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '2_any_used',
	command: {
		id: 'workBench.action.openPreviousRecentlyUsedEditor',
		title: nls.localize({ key: 'miPreviousRecentlyUsedEditor', comment: ['&& denotes a mnemonic'] }, "&&Previous Used Editor")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '3_group',
	command: {
		id: 'workBench.action.nextEditorInGroup',
		title: nls.localize({ key: 'miNextEditorInGroup', comment: ['&& denotes a mnemonic'] }, "&&Next Editor in Group")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '3_group',
	command: {
		id: 'workBench.action.previousEditorInGroup',
		title: nls.localize({ key: 'miPreviousEditorInGroup', comment: ['&& denotes a mnemonic'] }, "&&Previous Editor in Group")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '4_group_used',
	command: {
		id: 'workBench.action.openNextRecentlyUsedEditorInGroup',
		title: nls.localize({ key: 'miNextUsedEditorInGroup', comment: ['&& denotes a mnemonic'] }, "&&Next Used Editor in Group")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchEditorMenu, {
	group: '4_group_used',
	command: {
		id: 'workBench.action.openPreviousRecentlyUsedEditorInGroup',
		title: nls.localize({ key: 'miPreviousUsedEditorInGroup', comment: ['&& denotes a mnemonic'] }, "&&Previous Used Editor in Group")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '2_editor_nav',
	title: nls.localize({ key: 'miSwitchEditor', comment: ['&& denotes a mnemonic'] }, "Switch &&Editor"),
	suBmenu: MenuId.MenuBarSwitchEditorMenu,
	order: 1
});

// Switch Group
MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '1_focus_index',
	command: {
		id: 'workBench.action.focusFirstEditorGroup',
		title: nls.localize({ key: 'miFocusFirstGroup', comment: ['&& denotes a mnemonic'] }, "Group &&1")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '1_focus_index',
	command: {
		id: 'workBench.action.focusSecondEditorGroup',
		title: nls.localize({ key: 'miFocusSecondGroup', comment: ['&& denotes a mnemonic'] }, "Group &&2")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '1_focus_index',
	command: {
		id: 'workBench.action.focusThirdEditorGroup',
		title: nls.localize({ key: 'miFocusThirdGroup', comment: ['&& denotes a mnemonic'] }, "Group &&3"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 3
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '1_focus_index',
	command: {
		id: 'workBench.action.focusFourthEditorGroup',
		title: nls.localize({ key: 'miFocusFourthGroup', comment: ['&& denotes a mnemonic'] }, "Group &&4"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 4
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '1_focus_index',
	command: {
		id: 'workBench.action.focusFifthEditorGroup',
		title: nls.localize({ key: 'miFocusFifthGroup', comment: ['&& denotes a mnemonic'] }, "Group &&5"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 5
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '2_next_prev',
	command: {
		id: 'workBench.action.focusNextGroup',
		title: nls.localize({ key: 'miNextGroup', comment: ['&& denotes a mnemonic'] }, "&&Next Group"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '2_next_prev',
	command: {
		id: 'workBench.action.focusPreviousGroup',
		title: nls.localize({ key: 'miPreviousGroup', comment: ['&& denotes a mnemonic'] }, "&&Previous Group"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '3_directional',
	command: {
		id: 'workBench.action.focusLeftGroup',
		title: nls.localize({ key: 'miFocusLeftGroup', comment: ['&& denotes a mnemonic'] }, "Group &&Left"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '3_directional',
	command: {
		id: 'workBench.action.focusRightGroup',
		title: nls.localize({ key: 'miFocusRightGroup', comment: ['&& denotes a mnemonic'] }, "Group &&Right"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '3_directional',
	command: {
		id: 'workBench.action.focusABoveGroup',
		title: nls.localize({ key: 'miFocusABoveGroup', comment: ['&& denotes a mnemonic'] }, "Group &&ABove"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 3
});

MenuRegistry.appendMenuItem(MenuId.MenuBarSwitchGroupMenu, {
	group: '3_directional',
	command: {
		id: 'workBench.action.focusBelowGroup',
		title: nls.localize({ key: 'miFocusBelowGroup', comment: ['&& denotes a mnemonic'] }, "Group &&Below"),
		precondition: ContextKeyExpr.has('multipleEditorGroups')
	},
	order: 4
});

MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '2_editor_nav',
	title: nls.localize({ key: 'miSwitchGroup', comment: ['&& denotes a mnemonic'] }, "Switch &&Group"),
	suBmenu: MenuId.MenuBarSwitchGroupMenu,
	order: 2
});
