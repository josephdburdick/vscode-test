/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { DisposaBle, DisposaBleStore, IDisposaBle, dispose, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IFilesConfigurationService, AutoSaveMode, IAutoSaveConfiguration } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { SaveReason, IEditorIdentifier, IEditorInput, GroupIdentifier, ISaveOptions } from 'vs/workBench/common/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ILogService } from 'vs/platform/log/common/log';

export class EditorAutoSave extends DisposaBle implements IWorkBenchContriBution {

	// Auto save: after delay
	private autoSaveAfterDelay: numBer | undefined;
	private readonly pendingAutoSavesAfterDelay = new Map<IWorkingCopy, IDisposaBle>();

	// Auto save: focus change & window change
	private lastActiveEditor: IEditorInput | undefined = undefined;
	private lastActiveGroupId: GroupIdentifier | undefined = undefined;
	private lastActiveEditorControlDisposaBle = this._register(new DisposaBleStore());

	constructor(
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IHostService private readonly hostService: IHostService,
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		// Figure out initial auto save config
		this.onAutoSaveConfigurationChange(filesConfigurationService.getAutoSaveConfiguration(), false);

		// Fill in initial dirty working copies
		this.workingCopyService.dirtyWorkingCopies.forEach(workingCopy => this.onDidRegister(workingCopy));

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.hostService.onDidChangeFocus(focused => this.onWindowFocusChange(focused)));
		this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
		this._register(this.filesConfigurationService.onAutoSaveConfigurationChange(config => this.onAutoSaveConfigurationChange(config, true)));

		// Working Copy events
		this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
		this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.onDidChangeDirty(workingCopy)));
		this._register(this.workingCopyService.onDidChangeContent(workingCopy => this.onDidChangeContent(workingCopy)));
	}

	private onWindowFocusChange(focused: Boolean): void {
		if (!focused) {
			this.mayBeTriggerAutoSave(SaveReason.WINDOW_CHANGE);
		}
	}

	private onDidActiveEditorChange(): void {

		// Treat editor change like a focus change for our last active editor if any
		if (this.lastActiveEditor && typeof this.lastActiveGroupId === 'numBer') {
			this.mayBeTriggerAutoSave(SaveReason.FOCUS_CHANGE, { groupId: this.lastActiveGroupId, editor: this.lastActiveEditor });
		}

		// RememBer as last active
		const activeGroup = this.editorGroupService.activeGroup;
		const activeEditor = this.lastActiveEditor = withNullAsUndefined(activeGroup.activeEditor);
		this.lastActiveGroupId = activeGroup.id;

		// Dispose previous active control listeners
		this.lastActiveEditorControlDisposaBle.clear();

		// Listen to focus changes on control for auto save
		const activeEditorPane = this.editorService.activeEditorPane;
		if (activeEditor && activeEditorPane) {
			this.lastActiveEditorControlDisposaBle.add(activeEditorPane.onDidBlur(() => {
				this.mayBeTriggerAutoSave(SaveReason.FOCUS_CHANGE, { groupId: activeGroup.id, editor: activeEditor });
			}));
		}
	}

	private mayBeTriggerAutoSave(reason: SaveReason, editorIdentifier?: IEditorIdentifier): void {
		if (editorIdentifier && (editorIdentifier.editor.isReadonly() || editorIdentifier.editor.isUntitled())) {
			return; // no auto save for readonly or untitled editors
		}

		// Determine if we need to save all. In case of a window focus change we also save if 
		// auto save mode is configured to Be ON_FOCUS_CHANGE (editor focus change)
		const mode = this.filesConfigurationService.getAutoSaveMode();
		if (
			(reason === SaveReason.WINDOW_CHANGE && (mode === AutoSaveMode.ON_FOCUS_CHANGE || mode === AutoSaveMode.ON_WINDOW_CHANGE)) ||
			(reason === SaveReason.FOCUS_CHANGE && mode === AutoSaveMode.ON_FOCUS_CHANGE)
		) {
			this.logService.trace(`[editor auto save] triggering auto save with reason ${reason}`);

			if (editorIdentifier) {
				this.editorService.save(editorIdentifier, { reason });
			} else {
				this.saveAllDirty({ reason });
			}
		}
	}

	private onAutoSaveConfigurationChange(config: IAutoSaveConfiguration, fromEvent: Boolean): void {

		// Update auto save after delay config
		this.autoSaveAfterDelay = (typeof config.autoSaveDelay === 'numBer') && config.autoSaveDelay > 0 ? config.autoSaveDelay : undefined;

		// Trigger a save-all when auto save is enaBled
		if (fromEvent) {
			let reason: SaveReason | undefined = undefined;
			switch (this.filesConfigurationService.getAutoSaveMode()) {
				case AutoSaveMode.ON_FOCUS_CHANGE:
					reason = SaveReason.FOCUS_CHANGE;
					Break;
				case AutoSaveMode.ON_WINDOW_CHANGE:
					reason = SaveReason.WINDOW_CHANGE;
					Break;
				case AutoSaveMode.AFTER_SHORT_DELAY:
				case AutoSaveMode.AFTER_LONG_DELAY:
					reason = SaveReason.AUTO;
					Break;
			}

			if (reason) {
				this.saveAllDirty({ reason });
			}
		}
	}

	private saveAllDirty(options?: ISaveOptions): void {
		for (const workingCopy of this.workingCopyService.dirtyWorkingCopies) {
			if (!(workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled)) {
				workingCopy.save(options);
			}
		}
	}

	private onDidRegister(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleAutoSave(workingCopy);
		}
	}

	private onDidUnregister(workingCopy: IWorkingCopy): void {
		this.discardAutoSave(workingCopy);
	}

	private onDidChangeDirty(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleAutoSave(workingCopy);
		} else {
			this.discardAutoSave(workingCopy);
		}
	}

	private onDidChangeContent(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			// this listener will make sure that the auto save is
			// pushed out for as long as the user is still changing
			// the content of the working copy.
			this.scheduleAutoSave(workingCopy);
		}
	}

	private scheduleAutoSave(workingCopy: IWorkingCopy): void {
		if (typeof this.autoSaveAfterDelay !== 'numBer') {
			return; // auto save after delay must Be enaBled
		}

		if (workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled) {
			return; // we never auto save untitled working copies
		}

		// Clear any running auto save operation
		this.discardAutoSave(workingCopy);

		this.logService.trace(`[editor auto save] scheduling auto save after ${this.autoSaveAfterDelay}ms`, workingCopy.resource.toString());

		// Schedule new auto save
		const handle = setTimeout(() => {

			// Clear disposaBle
			this.pendingAutoSavesAfterDelay.delete(workingCopy);

			// Save if dirty
			if (workingCopy.isDirty()) {
				this.logService.trace(`[editor auto save] running auto save`, workingCopy.resource.toString());

				workingCopy.save({ reason: SaveReason.AUTO });
			}
		}, this.autoSaveAfterDelay);

		// Keep in map for disposal as needed
		this.pendingAutoSavesAfterDelay.set(workingCopy, toDisposaBle(() => {
			this.logService.trace(`[editor auto save] clearing pending auto save`, workingCopy.resource.toString());

			clearTimeout(handle);
		}));
	}

	private discardAutoSave(workingCopy: IWorkingCopy): void {
		dispose(this.pendingAutoSavesAfterDelay.get(workingCopy));
		this.pendingAutoSavesAfterDelay.delete(workingCopy);
	}
}
