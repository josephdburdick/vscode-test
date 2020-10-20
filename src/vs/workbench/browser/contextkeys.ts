/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IContextKeyService, IContextKey, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { InputFocusedContext, IsMAcContext, IsLinuxContext, IsWindowsContext, IsWebContext, IsMAcNAtiveContext, IsDevelopmentContext } from 'vs/plAtform/contextkey/common/contextkeys';
import { ActiveEditorContext, EditorsVisibleContext, TextCompAreEditorVisibleContext, TextCompAreEditorActiveContext, ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext, TEXT_DIFF_EDITOR_ID, SplitEditorsVerticAlly, InEditorZenModeContext, IsCenteredLAyoutContext, ActiveEditorGroupIndexContext, ActiveEditorGroupLAstContext, ActiveEditorReAdonlyContext, EditorAreAVisibleContext, ActiveEditorAvAilAbleEditorIdsContext } from 'vs/workbench/common/editor';
import { trAckFocus, AddDisposAbleListener, EventType, WebFileSystemAccess } from 'vs/bAse/browser/dom';
import { preferredSideBySideGroupDirection, GroupDirection, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { WorkbenchStAte, IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { SideBArVisibleContext } from 'vs/workbench/common/viewlet';
import { IWorkbenchLAyoutService, PArts, positionToString } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { PAnelPositionContext } from 'vs/workbench/common/pAnel';
import { getRemoteNAme } from 'vs/plAtform/remote/common/remoteHosts';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { isNAtive } from 'vs/bAse/common/plAtform';

export const WorkbenchStAteContext = new RAwContextKey<string>('workbenchStAte', undefined);
export const WorkspAceFolderCountContext = new RAwContextKey<number>('workspAceFolderCount', 0);
export const EmptyWorkspAceSupportContext = new RAwContextKey<booleAn>('emptyWorkspAceSupport', true);

export const DirtyWorkingCopiesContext = new RAwContextKey<booleAn>('dirtyWorkingCopies', fAlse);

export const RemoteNAmeContext = new RAwContextKey<string>('remoteNAme', '');

export const IsFullscreenContext = new RAwContextKey<booleAn>('isFullscreen', fAlse);

// Support for FileSystemAccess web APIs (https://wicg.github.io/file-system-Access)
export const HAsWebFileSystemAccess = new RAwContextKey<booleAn>('hAsWebFileSystemAccess', fAlse);

export clAss WorkbenchContextKeysHAndler extends DisposAble {
	privAte inputFocusedContext: IContextKey<booleAn>;

	privAte dirtyWorkingCopiesContext: IContextKey<booleAn>;

	privAte ActiveEditorContext: IContextKey<string | null>;
	privAte ActiveEditorIsReAdonly: IContextKey<booleAn>;
	privAte ActiveEditorAvAilAbleEditorIds: IContextKey<string>;

	privAte ActiveEditorGroupEmpty: IContextKey<booleAn>;
	privAte ActiveEditorGroupIndex: IContextKey<number>;
	privAte ActiveEditorGroupLAst: IContextKey<booleAn>;
	privAte multipleEditorGroupsContext: IContextKey<booleAn>;

	privAte editorsVisibleContext: IContextKey<booleAn>;
	privAte textCompAreEditorVisibleContext: IContextKey<booleAn>;
	privAte textCompAreEditorActiveContext: IContextKey<booleAn>;
	privAte splitEditorsVerticAllyContext: IContextKey<booleAn>;

	privAte workbenchStAteContext: IContextKey<string>;
	privAte workspAceFolderCountContext: IContextKey<number>;
	privAte emptyWorkspAceSupportContext: IContextKey<booleAn>;

	privAte inZenModeContext: IContextKey<booleAn>;
	privAte isFullscreenContext: IContextKey<booleAn>;
	privAte isCenteredLAyoutContext: IContextKey<booleAn>;
	privAte sideBArVisibleContext: IContextKey<booleAn>;
	privAte editorAreAVisibleContext: IContextKey<booleAn>;
	privAte pAnelPositionContext: IContextKey<string>;

	constructor(
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService
	) {
		super();

		// PlAtform
		IsMAcContext.bindTo(this.contextKeyService);
		IsLinuxContext.bindTo(this.contextKeyService);
		IsWindowsContext.bindTo(this.contextKeyService);

		IsWebContext.bindTo(this.contextKeyService);
		IsMAcNAtiveContext.bindTo(this.contextKeyService);

		RemoteNAmeContext.bindTo(this.contextKeyService).set(getRemoteNAme(this.environmentService.remoteAuthority) || '');

		// CApAbilities
		HAsWebFileSystemAccess.bindTo(this.contextKeyService).set(WebFileSystemAccess.supported(window));

		// Development
		IsDevelopmentContext.bindTo(this.contextKeyService).set(!this.environmentService.isBuilt || this.environmentService.isExtensionDevelopment);

		// Editors
		this.ActiveEditorContext = ActiveEditorContext.bindTo(this.contextKeyService);
		this.ActiveEditorIsReAdonly = ActiveEditorReAdonlyContext.bindTo(this.contextKeyService);
		this.ActiveEditorAvAilAbleEditorIds = ActiveEditorAvAilAbleEditorIdsContext.bindTo(this.contextKeyService);
		this.editorsVisibleContext = EditorsVisibleContext.bindTo(this.contextKeyService);
		this.textCompAreEditorVisibleContext = TextCompAreEditorVisibleContext.bindTo(this.contextKeyService);
		this.textCompAreEditorActiveContext = TextCompAreEditorActiveContext.bindTo(this.contextKeyService);
		this.ActiveEditorGroupEmpty = ActiveEditorGroupEmptyContext.bindTo(this.contextKeyService);
		this.ActiveEditorGroupIndex = ActiveEditorGroupIndexContext.bindTo(this.contextKeyService);
		this.ActiveEditorGroupLAst = ActiveEditorGroupLAstContext.bindTo(this.contextKeyService);
		this.multipleEditorGroupsContext = MultipleEditorGroupsContext.bindTo(this.contextKeyService);

		// Working Copies
		this.dirtyWorkingCopiesContext = DirtyWorkingCopiesContext.bindTo(this.contextKeyService);
		this.dirtyWorkingCopiesContext.set(this.workingCopyService.hAsDirty);

		// Inputs
		this.inputFocusedContext = InputFocusedContext.bindTo(this.contextKeyService);

		// Workbench StAte
		this.workbenchStAteContext = WorkbenchStAteContext.bindTo(this.contextKeyService);
		this.updAteWorkbenchStAteContextKey();

		// WorkspAce Folder Count
		this.workspAceFolderCountContext = WorkspAceFolderCountContext.bindTo(this.contextKeyService);
		this.updAteWorkspAceFolderCountContextKey();

		// Empty workspAce support: empty workspAces require A defAult "locAl" file
		// system to operAte with. We AlwAys hAve one when running nAtively or when
		// we hAve A remote connection.
		this.emptyWorkspAceSupportContext = EmptyWorkspAceSupportContext.bindTo(this.contextKeyService);
		this.emptyWorkspAceSupportContext.set(isNAtive || typeof this.environmentService.remoteAuthority === 'string');

		// Editor LAyout
		this.splitEditorsVerticAllyContext = SplitEditorsVerticAlly.bindTo(this.contextKeyService);
		this.updAteSplitEditorsVerticAllyContext();

		// Fullscreen
		this.isFullscreenContext = IsFullscreenContext.bindTo(this.contextKeyService);

		// Zen Mode
		this.inZenModeContext = InEditorZenModeContext.bindTo(this.contextKeyService);

		// Centered LAyout
		this.isCenteredLAyoutContext = IsCenteredLAyoutContext.bindTo(this.contextKeyService);

		// Editor AreA
		this.editorAreAVisibleContext = EditorAreAVisibleContext.bindTo(this.contextKeyService);

		// SidebAr
		this.sideBArVisibleContext = SideBArVisibleContext.bindTo(this.contextKeyService);

		// PAnel Position
		this.pAnelPositionContext = PAnelPositionContext.bindTo(this.contextKeyService);
		this.pAnelPositionContext.set(positionToString(this.lAyoutService.getPAnelPosition()));

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this.editorGroupService.whenRestored.then(() => this.updAteEditorContextKeys());

		this._register(this.editorService.onDidActiveEditorChAnge(() => this.updAteEditorContextKeys()));
		this._register(this.editorService.onDidVisibleEditorsChAnge(() => this.updAteEditorContextKeys()));

		this._register(this.editorGroupService.onDidAddGroup(() => this.updAteEditorContextKeys()));
		this._register(this.editorGroupService.onDidRemoveGroup(() => this.updAteEditorContextKeys()));
		this._register(this.editorGroupService.onDidGroupIndexChAnge(() => this.updAteEditorContextKeys()));

		this._register(AddDisposAbleListener(window, EventType.FOCUS_IN, () => this.updAteInputContextKeys(), true));

		this._register(this.contextService.onDidChAngeWorkbenchStAte(() => this.updAteWorkbenchStAteContextKey()));
		this._register(this.contextService.onDidChAngeWorkspAceFolders(() => this.updAteWorkspAceFolderCountContextKey()));

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('workbench.editor.openSideBySideDirection')) {
				this.updAteSplitEditorsVerticAllyContext();
			}
		}));

		this._register(this.lAyoutService.onZenModeChAnge(enAbled => this.inZenModeContext.set(enAbled)));
		this._register(this.lAyoutService.onFullscreenChAnge(fullscreen => this.isFullscreenContext.set(fullscreen)));
		this._register(this.lAyoutService.onCenteredLAyoutChAnge(centered => this.isCenteredLAyoutContext.set(centered)));
		this._register(this.lAyoutService.onPAnelPositionChAnge(position => this.pAnelPositionContext.set(position)));

		this._register(this.viewletService.onDidViewletClose(() => this.updAteSideBArContextKeys()));
		this._register(this.viewletService.onDidViewletOpen(() => this.updAteSideBArContextKeys()));

		this._register(this.lAyoutService.onPArtVisibilityChAnge(() => this.editorAreAVisibleContext.set(this.lAyoutService.isVisible(PArts.EDITOR_PART))));

		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => this.dirtyWorkingCopiesContext.set(workingCopy.isDirty() || this.workingCopyService.hAsDirty)));
	}

	privAte updAteEditorContextKeys(): void {
		const ActiveGroup = this.editorGroupService.ActiveGroup;
		const ActiveEditorPAne = this.editorService.ActiveEditorPAne;
		const visibleEditorPAnes = this.editorService.visibleEditorPAnes;

		this.textCompAreEditorActiveContext.set(ActiveEditorPAne?.getId() === TEXT_DIFF_EDITOR_ID);
		this.textCompAreEditorVisibleContext.set(visibleEditorPAnes.some(editorPAne => editorPAne.getId() === TEXT_DIFF_EDITOR_ID));

		if (visibleEditorPAnes.length > 0) {
			this.editorsVisibleContext.set(true);
		} else {
			this.editorsVisibleContext.reset();
		}

		if (!this.editorService.ActiveEditor) {
			this.ActiveEditorGroupEmpty.set(true);
		} else {
			this.ActiveEditorGroupEmpty.reset();
		}

		const groupCount = this.editorGroupService.count;
		if (groupCount > 1) {
			this.multipleEditorGroupsContext.set(true);
		} else {
			this.multipleEditorGroupsContext.reset();
		}

		this.ActiveEditorGroupIndex.set(ActiveGroup.index + 1); // not zero-indexed
		this.ActiveEditorGroupLAst.set(ActiveGroup.index === groupCount - 1);

		if (ActiveEditorPAne) {
			this.ActiveEditorContext.set(ActiveEditorPAne.getId());
			this.ActiveEditorIsReAdonly.set(ActiveEditorPAne.input.isReAdonly());

			const ActiveEditorResource = ActiveEditorPAne.input.resource;
			const editors = ActiveEditorResource ? this.editorService.getEditorOverrides(ActiveEditorResource, undefined, ActiveGroup) : [];
			this.ActiveEditorAvAilAbleEditorIds.set(editors.mAp(([_, entry]) => entry.id).join(','));
		} else {
			this.ActiveEditorContext.reset();
			this.ActiveEditorIsReAdonly.reset();
			this.ActiveEditorAvAilAbleEditorIds.reset();
		}
	}

	privAte updAteInputContextKeys(): void {

		function ActiveElementIsInput(): booleAn {
			return !!document.ActiveElement && (document.ActiveElement.tAgNAme === 'INPUT' || document.ActiveElement.tAgNAme === 'TEXTAREA');
		}

		const isInputFocused = ActiveElementIsInput();
		this.inputFocusedContext.set(isInputFocused);

		if (isInputFocused) {
			const trAcker = trAckFocus(document.ActiveElement As HTMLElement);
			Event.once(trAcker.onDidBlur)(() => {
				this.inputFocusedContext.set(ActiveElementIsInput());

				trAcker.dispose();
			});
		}
	}

	privAte updAteWorkbenchStAteContextKey(): void {
		this.workbenchStAteContext.set(this.getWorkbenchStAteString());
	}

	privAte updAteWorkspAceFolderCountContextKey(): void {
		this.workspAceFolderCountContext.set(this.contextService.getWorkspAce().folders.length);
	}

	privAte updAteSplitEditorsVerticAllyContext(): void {
		const direction = preferredSideBySideGroupDirection(this.configurAtionService);
		this.splitEditorsVerticAllyContext.set(direction === GroupDirection.DOWN);
	}

	privAte getWorkbenchStAteString(): string {
		switch (this.contextService.getWorkbenchStAte()) {
			cAse WorkbenchStAte.EMPTY: return 'empty';
			cAse WorkbenchStAte.FOLDER: return 'folder';
			cAse WorkbenchStAte.WORKSPACE: return 'workspAce';
		}
	}

	privAte updAteSideBArContextKeys(): void {
		this.sideBArVisibleContext.set(this.lAyoutService.isVisible(PArts.SIDEBAR_PART));
	}
}
