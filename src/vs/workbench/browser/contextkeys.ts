/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IContextKeyService, IContextKey, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { InputFocusedContext, IsMacContext, IsLinuxContext, IsWindowsContext, IsWeBContext, IsMacNativeContext, IsDevelopmentContext } from 'vs/platform/contextkey/common/contextkeys';
import { ActiveEditorContext, EditorsVisiBleContext, TextCompareEditorVisiBleContext, TextCompareEditorActiveContext, ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext, TEXT_DIFF_EDITOR_ID, SplitEditorsVertically, InEditorZenModeContext, IsCenteredLayoutContext, ActiveEditorGroupIndexContext, ActiveEditorGroupLastContext, ActiveEditorReadonlyContext, EditorAreaVisiBleContext, ActiveEditorAvailaBleEditorIdsContext } from 'vs/workBench/common/editor';
import { trackFocus, addDisposaBleListener, EventType, WeBFileSystemAccess } from 'vs/Base/Browser/dom';
import { preferredSideBySideGroupDirection, GroupDirection, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { WorkBenchState, IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { SideBarVisiBleContext } from 'vs/workBench/common/viewlet';
import { IWorkBenchLayoutService, Parts, positionToString } from 'vs/workBench/services/layout/Browser/layoutService';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { PanelPositionContext } from 'vs/workBench/common/panel';
import { getRemoteName } from 'vs/platform/remote/common/remoteHosts';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { isNative } from 'vs/Base/common/platform';

export const WorkBenchStateContext = new RawContextKey<string>('workBenchState', undefined);
export const WorkspaceFolderCountContext = new RawContextKey<numBer>('workspaceFolderCount', 0);
export const EmptyWorkspaceSupportContext = new RawContextKey<Boolean>('emptyWorkspaceSupport', true);

export const DirtyWorkingCopiesContext = new RawContextKey<Boolean>('dirtyWorkingCopies', false);

export const RemoteNameContext = new RawContextKey<string>('remoteName', '');

export const IsFullscreenContext = new RawContextKey<Boolean>('isFullscreen', false);

// Support for FileSystemAccess weB APIs (https://wicg.githuB.io/file-system-access)
export const HasWeBFileSystemAccess = new RawContextKey<Boolean>('hasWeBFileSystemAccess', false);

export class WorkBenchContextKeysHandler extends DisposaBle {
	private inputFocusedContext: IContextKey<Boolean>;

	private dirtyWorkingCopiesContext: IContextKey<Boolean>;

	private activeEditorContext: IContextKey<string | null>;
	private activeEditorIsReadonly: IContextKey<Boolean>;
	private activeEditorAvailaBleEditorIds: IContextKey<string>;

	private activeEditorGroupEmpty: IContextKey<Boolean>;
	private activeEditorGroupIndex: IContextKey<numBer>;
	private activeEditorGroupLast: IContextKey<Boolean>;
	private multipleEditorGroupsContext: IContextKey<Boolean>;

	private editorsVisiBleContext: IContextKey<Boolean>;
	private textCompareEditorVisiBleContext: IContextKey<Boolean>;
	private textCompareEditorActiveContext: IContextKey<Boolean>;
	private splitEditorsVerticallyContext: IContextKey<Boolean>;

	private workBenchStateContext: IContextKey<string>;
	private workspaceFolderCountContext: IContextKey<numBer>;
	private emptyWorkspaceSupportContext: IContextKey<Boolean>;

	private inZenModeContext: IContextKey<Boolean>;
	private isFullscreenContext: IContextKey<Boolean>;
	private isCenteredLayoutContext: IContextKey<Boolean>;
	private sideBarVisiBleContext: IContextKey<Boolean>;
	private editorAreaVisiBleContext: IContextKey<Boolean>;
	private panelPositionContext: IContextKey<string>;

	constructor(
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IViewletService private readonly viewletService: IViewletService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService
	) {
		super();

		// Platform
		IsMacContext.BindTo(this.contextKeyService);
		IsLinuxContext.BindTo(this.contextKeyService);
		IsWindowsContext.BindTo(this.contextKeyService);

		IsWeBContext.BindTo(this.contextKeyService);
		IsMacNativeContext.BindTo(this.contextKeyService);

		RemoteNameContext.BindTo(this.contextKeyService).set(getRemoteName(this.environmentService.remoteAuthority) || '');

		// CapaBilities
		HasWeBFileSystemAccess.BindTo(this.contextKeyService).set(WeBFileSystemAccess.supported(window));

		// Development
		IsDevelopmentContext.BindTo(this.contextKeyService).set(!this.environmentService.isBuilt || this.environmentService.isExtensionDevelopment);

		// Editors
		this.activeEditorContext = ActiveEditorContext.BindTo(this.contextKeyService);
		this.activeEditorIsReadonly = ActiveEditorReadonlyContext.BindTo(this.contextKeyService);
		this.activeEditorAvailaBleEditorIds = ActiveEditorAvailaBleEditorIdsContext.BindTo(this.contextKeyService);
		this.editorsVisiBleContext = EditorsVisiBleContext.BindTo(this.contextKeyService);
		this.textCompareEditorVisiBleContext = TextCompareEditorVisiBleContext.BindTo(this.contextKeyService);
		this.textCompareEditorActiveContext = TextCompareEditorActiveContext.BindTo(this.contextKeyService);
		this.activeEditorGroupEmpty = ActiveEditorGroupEmptyContext.BindTo(this.contextKeyService);
		this.activeEditorGroupIndex = ActiveEditorGroupIndexContext.BindTo(this.contextKeyService);
		this.activeEditorGroupLast = ActiveEditorGroupLastContext.BindTo(this.contextKeyService);
		this.multipleEditorGroupsContext = MultipleEditorGroupsContext.BindTo(this.contextKeyService);

		// Working Copies
		this.dirtyWorkingCopiesContext = DirtyWorkingCopiesContext.BindTo(this.contextKeyService);
		this.dirtyWorkingCopiesContext.set(this.workingCopyService.hasDirty);

		// Inputs
		this.inputFocusedContext = InputFocusedContext.BindTo(this.contextKeyService);

		// WorkBench State
		this.workBenchStateContext = WorkBenchStateContext.BindTo(this.contextKeyService);
		this.updateWorkBenchStateContextKey();

		// Workspace Folder Count
		this.workspaceFolderCountContext = WorkspaceFolderCountContext.BindTo(this.contextKeyService);
		this.updateWorkspaceFolderCountContextKey();

		// Empty workspace support: empty workspaces require a default "local" file
		// system to operate with. We always have one when running natively or when
		// we have a remote connection.
		this.emptyWorkspaceSupportContext = EmptyWorkspaceSupportContext.BindTo(this.contextKeyService);
		this.emptyWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');

		// Editor Layout
		this.splitEditorsVerticallyContext = SplitEditorsVertically.BindTo(this.contextKeyService);
		this.updateSplitEditorsVerticallyContext();

		// Fullscreen
		this.isFullscreenContext = IsFullscreenContext.BindTo(this.contextKeyService);

		// Zen Mode
		this.inZenModeContext = InEditorZenModeContext.BindTo(this.contextKeyService);

		// Centered Layout
		this.isCenteredLayoutContext = IsCenteredLayoutContext.BindTo(this.contextKeyService);

		// Editor Area
		this.editorAreaVisiBleContext = EditorAreaVisiBleContext.BindTo(this.contextKeyService);

		// SideBar
		this.sideBarVisiBleContext = SideBarVisiBleContext.BindTo(this.contextKeyService);

		// Panel Position
		this.panelPositionContext = PanelPositionContext.BindTo(this.contextKeyService);
		this.panelPositionContext.set(positionToString(this.layoutService.getPanelPosition()));

		this.registerListeners();
	}

	private registerListeners(): void {
		this.editorGroupService.whenRestored.then(() => this.updateEditorContextKeys());

		this._register(this.editorService.onDidActiveEditorChange(() => this.updateEditorContextKeys()));
		this._register(this.editorService.onDidVisiBleEditorsChange(() => this.updateEditorContextKeys()));

		this._register(this.editorGroupService.onDidAddGroup(() => this.updateEditorContextKeys()));
		this._register(this.editorGroupService.onDidRemoveGroup(() => this.updateEditorContextKeys()));
		this._register(this.editorGroupService.onDidGroupIndexChange(() => this.updateEditorContextKeys()));

		this._register(addDisposaBleListener(window, EventType.FOCUS_IN, () => this.updateInputContextKeys(), true));

		this._register(this.contextService.onDidChangeWorkBenchState(() => this.updateWorkBenchStateContextKey()));
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.updateWorkspaceFolderCountContextKey()));

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('workBench.editor.openSideBySideDirection')) {
				this.updateSplitEditorsVerticallyContext();
			}
		}));

		this._register(this.layoutService.onZenModeChange(enaBled => this.inZenModeContext.set(enaBled)));
		this._register(this.layoutService.onFullscreenChange(fullscreen => this.isFullscreenContext.set(fullscreen)));
		this._register(this.layoutService.onCenteredLayoutChange(centered => this.isCenteredLayoutContext.set(centered)));
		this._register(this.layoutService.onPanelPositionChange(position => this.panelPositionContext.set(position)));

		this._register(this.viewletService.onDidViewletClose(() => this.updateSideBarContextKeys()));
		this._register(this.viewletService.onDidViewletOpen(() => this.updateSideBarContextKeys()));

		this._register(this.layoutService.onPartVisiBilityChange(() => this.editorAreaVisiBleContext.set(this.layoutService.isVisiBle(Parts.EDITOR_PART))));

		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.dirtyWorkingCopiesContext.set(workingCopy.isDirty() || this.workingCopyService.hasDirty)));
	}

	private updateEditorContextKeys(): void {
		const activeGroup = this.editorGroupService.activeGroup;
		const activeEditorPane = this.editorService.activeEditorPane;
		const visiBleEditorPanes = this.editorService.visiBleEditorPanes;

		this.textCompareEditorActiveContext.set(activeEditorPane?.getId() === TEXT_DIFF_EDITOR_ID);
		this.textCompareEditorVisiBleContext.set(visiBleEditorPanes.some(editorPane => editorPane.getId() === TEXT_DIFF_EDITOR_ID));

		if (visiBleEditorPanes.length > 0) {
			this.editorsVisiBleContext.set(true);
		} else {
			this.editorsVisiBleContext.reset();
		}

		if (!this.editorService.activeEditor) {
			this.activeEditorGroupEmpty.set(true);
		} else {
			this.activeEditorGroupEmpty.reset();
		}

		const groupCount = this.editorGroupService.count;
		if (groupCount > 1) {
			this.multipleEditorGroupsContext.set(true);
		} else {
			this.multipleEditorGroupsContext.reset();
		}

		this.activeEditorGroupIndex.set(activeGroup.index + 1); // not zero-indexed
		this.activeEditorGroupLast.set(activeGroup.index === groupCount - 1);

		if (activeEditorPane) {
			this.activeEditorContext.set(activeEditorPane.getId());
			this.activeEditorIsReadonly.set(activeEditorPane.input.isReadonly());

			const activeEditorResource = activeEditorPane.input.resource;
			const editors = activeEditorResource ? this.editorService.getEditorOverrides(activeEditorResource, undefined, activeGroup) : [];
			this.activeEditorAvailaBleEditorIds.set(editors.map(([_, entry]) => entry.id).join(','));
		} else {
			this.activeEditorContext.reset();
			this.activeEditorIsReadonly.reset();
			this.activeEditorAvailaBleEditorIds.reset();
		}
	}

	private updateInputContextKeys(): void {

		function activeElementIsInput(): Boolean {
			return !!document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
		}

		const isInputFocused = activeElementIsInput();
		this.inputFocusedContext.set(isInputFocused);

		if (isInputFocused) {
			const tracker = trackFocus(document.activeElement as HTMLElement);
			Event.once(tracker.onDidBlur)(() => {
				this.inputFocusedContext.set(activeElementIsInput());

				tracker.dispose();
			});
		}
	}

	private updateWorkBenchStateContextKey(): void {
		this.workBenchStateContext.set(this.getWorkBenchStateString());
	}

	private updateWorkspaceFolderCountContextKey(): void {
		this.workspaceFolderCountContext.set(this.contextService.getWorkspace().folders.length);
	}

	private updateSplitEditorsVerticallyContext(): void {
		const direction = preferredSideBySideGroupDirection(this.configurationService);
		this.splitEditorsVerticallyContext.set(direction === GroupDirection.DOWN);
	}

	private getWorkBenchStateString(): string {
		switch (this.contextService.getWorkBenchState()) {
			case WorkBenchState.EMPTY: return 'empty';
			case WorkBenchState.FOLDER: return 'folder';
			case WorkBenchState.WORKSPACE: return 'workspace';
		}
	}

	private updateSideBarContextKeys(): void {
		this.sideBarVisiBleContext.set(this.layoutService.isVisiBle(Parts.SIDEBAR_PART));
	}
}
