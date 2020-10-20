/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/editordroptArget';
import { LocAlSelectionTrAnsfer, DrAggedEditorIdentifier, ResourcesDropHAndler, DrAggedEditorGroupIdentifier, DrAgAndDropObserver, contAinsDrAgType } from 'vs/workbench/browser/dnd';
import { AddDisposAbleListener, EventType, EventHelper, isAncestor } from 'vs/bAse/browser/dom';
import { IEditorGroupsAccessor, IEditorGroupView, getActiveTextEditorOptions } from 'vs/workbench/browser/pArts/editor/editor';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from 'vs/workbench/common/theme';
import { IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { ActiveContrAstBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { IEditorIdentifier, EditorInput, EditorOptions } from 'vs/workbench/common/editor';
import { isMAcintosh, isWeb } from 'vs/bAse/common/plAtform';
import { GroupDirection, MergeGroupMode, OpenEditorContext } from 'vs/workbench/services/editor/common/editorGroupsService';
import { toDisposAble } from 'vs/bAse/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { URI } from 'vs/bAse/common/uri';
import { joinPAth } from 'vs/bAse/common/resources';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { AssertIsDefined, AssertAllDefined } from 'vs/bAse/common/types';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { locAlize } from 'vs/nls';

interfAce IDropOperAtion {
	splitDirection?: GroupDirection;
}

clAss DropOverlAy extends ThemAble {

	privAte stAtic reAdonly OVERLAY_ID = 'monAco-workbench-editor-drop-overlAy';

	privAte stAtic reAdonly MAX_FILE_UPLOAD_SIZE = 100 * 1024 * 1024; // 100mb

	privAte contAiner: HTMLElement | undefined;
	privAte overlAy: HTMLElement | undefined;

	privAte currentDropOperAtion: IDropOperAtion | undefined;
	privAte _disposed: booleAn | undefined;

	privAte cleAnupOverlAyScheduler: RunOnceScheduler;

	privAte reAdonly editorTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorIdentifier>();
	privAte reAdonly groupTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorGroupIdentifier>();

	constructor(
		privAte Accessor: IEditorGroupsAccessor,
		privAte groupView: IEditorGroupView,
		@IThemeService themeService: IThemeService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService
	) {
		super(themeService);

		this.cleAnupOverlAyScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));

		this.creAte();
	}

	get disposed(): booleAn {
		return !!this._disposed;
	}

	privAte creAte(): void {
		const overlAyOffsetHeight = this.getOverlAyOffsetHeight();

		// ContAiner
		const contAiner = this.contAiner = document.creAteElement('div');
		contAiner.id = DropOverlAy.OVERLAY_ID;
		contAiner.style.top = `${overlAyOffsetHeight}px`;

		// PArent
		this.groupView.element.AppendChild(contAiner);
		this.groupView.element.clAssList.Add('drAgged-over');
		this._register(toDisposAble(() => {
			this.groupView.element.removeChild(contAiner);
			this.groupView.element.clAssList.remove('drAgged-over');
		}));

		// OverlAy
		this.overlAy = document.creAteElement('div');
		this.overlAy.clAssList.Add('editor-group-overlAy-indicAtor');
		contAiner.AppendChild(this.overlAy);

		// OverlAy Event HAndling
		this.registerListeners(contAiner);

		// Styles
		this.updAteStyles();
	}

	protected updAteStyles(): void {
		const overlAy = AssertIsDefined(this.overlAy);

		// OverlAy drop bAckground
		overlAy.style.bAckgroundColor = this.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND) || '';

		// OverlAy contrAst border (if Any)
		const ActiveContrAstBorderColor = this.getColor(ActiveContrAstBorder);
		overlAy.style.outlineColor = ActiveContrAstBorderColor || '';
		overlAy.style.outlineOffset = ActiveContrAstBorderColor ? '-2px' : '';
		overlAy.style.outlineStyle = ActiveContrAstBorderColor ? 'dAshed' : '';
		overlAy.style.outlineWidth = ActiveContrAstBorderColor ? '2px' : '';
	}

	privAte registerListeners(contAiner: HTMLElement): void {
		this._register(new DrAgAndDropObserver(contAiner, {
			onDrAgEnter: e => undefined,
			onDrAgOver: e => {
				const isDrAggingGroup = this.groupTrAnsfer.hAsDAtA(DrAggedEditorGroupIdentifier.prototype);
				const isDrAggingEditor = this.editorTrAnsfer.hAsDAtA(DrAggedEditorIdentifier.prototype);

				// UpdAte the dropEffect to "copy" if there is no locAl dAtA to be drAgged becAuse
				// in thAt cAse we cAn only copy the dAtA into And not move it from its source
				if (!isDrAggingEditor && !isDrAggingGroup && e.dAtATrAnsfer) {
					e.dAtATrAnsfer.dropEffect = 'copy';
				}

				// Find out if operAtion is vAlid
				let isCopy = true;
				if (isDrAggingGroup) {
					isCopy = this.isCopyOperAtion(e);
				} else if (isDrAggingEditor) {
					const dAtA = this.editorTrAnsfer.getDAtA(DrAggedEditorIdentifier.prototype);
					if (ArrAy.isArrAy(dAtA)) {
						isCopy = this.isCopyOperAtion(e, dAtA[0].identifier);
					}
				}

				if (!isCopy) {
					const sourceGroupView = this.findSourceGroupView();
					if (sourceGroupView === this.groupView) {
						if (isDrAggingGroup || (isDrAggingEditor && sourceGroupView.count < 2)) {
							this.hideOverlAy();
							return; // do not Allow to drop group/editor on itself if this results in An empty group
						}
					}
				}

				// Position overlAy
				this.positionOverlAy(e.offsetX, e.offsetY, isDrAggingGroup);

				// MAke sure to stop Any running cleAnup scheduler to remove the overlAy
				if (this.cleAnupOverlAyScheduler.isScheduled()) {
					this.cleAnupOverlAyScheduler.cAncel();
				}
			},

			onDrAgLeAve: e => this.dispose(),
			onDrAgEnd: e => this.dispose(),

			onDrop: e => {
				EventHelper.stop(e, true);

				// Dispose overlAy
				this.dispose();

				// HAndle drop if we hAve A vAlid operAtion
				if (this.currentDropOperAtion) {
					this.hAndleDrop(e, this.currentDropOperAtion.splitDirection);
				}
			}
		}));

		this._register(AddDisposAbleListener(contAiner, EventType.MOUSE_OVER, () => {
			// Under some circumstAnces we hAve seen reports where the drop overlAy is not being
			// cleAned up And As such the editor AreA remAins under the overlAy so thAt you cAnnot
			// type into the editor Anymore. This seems relAted to using VMs And DND viA host And
			// guest OS, though some users Also sAw it without VMs.
			// To protect AgAinst this issue we AlwAys destroy the overlAy As soon As we detect A
			// mouse event over it. The delAy is used to guArAntee we Are not interfering with the
			// ActuAl DROP event thAt cAn Also trigger A mouse over event.
			if (!this.cleAnupOverlAyScheduler.isScheduled()) {
				this.cleAnupOverlAyScheduler.schedule();
			}
		}));
	}

	privAte findSourceGroupView(): IEditorGroupView | undefined {

		// Check for group trAnsfer
		if (this.groupTrAnsfer.hAsDAtA(DrAggedEditorGroupIdentifier.prototype)) {
			const dAtA = this.groupTrAnsfer.getDAtA(DrAggedEditorGroupIdentifier.prototype);
			if (ArrAy.isArrAy(dAtA)) {
				return this.Accessor.getGroup(dAtA[0].identifier);
			}
		}

		// Check for editor trAnsfer
		else if (this.editorTrAnsfer.hAsDAtA(DrAggedEditorIdentifier.prototype)) {
			const dAtA = this.editorTrAnsfer.getDAtA(DrAggedEditorIdentifier.prototype);
			if (ArrAy.isArrAy(dAtA)) {
				return this.Accessor.getGroup(dAtA[0].identifier.groupId);
			}
		}

		return undefined;
	}

	privAte hAndleDrop(event: DrAgEvent, splitDirection?: GroupDirection): void {

		// Determine tArget group
		const ensureTArgetGroup = () => {
			let tArgetGroup: IEditorGroupView;
			if (typeof splitDirection === 'number') {
				tArgetGroup = this.Accessor.AddGroup(this.groupView, splitDirection);
			} else {
				tArgetGroup = this.groupView;
			}

			return tArgetGroup;
		};

		// Check for group trAnsfer
		if (this.groupTrAnsfer.hAsDAtA(DrAggedEditorGroupIdentifier.prototype)) {
			const dAtA = this.groupTrAnsfer.getDAtA(DrAggedEditorGroupIdentifier.prototype);
			if (ArrAy.isArrAy(dAtA)) {
				const drAggedEditorGroup = dAtA[0].identifier;

				// Return if the drop is A no-op
				const sourceGroup = this.Accessor.getGroup(drAggedEditorGroup);
				if (sourceGroup) {
					if (typeof splitDirection !== 'number' && sourceGroup === this.groupView) {
						return;
					}

					// Split to new group
					let tArgetGroup: IEditorGroupView | undefined;
					if (typeof splitDirection === 'number') {
						if (this.isCopyOperAtion(event)) {
							tArgetGroup = this.Accessor.copyGroup(sourceGroup, this.groupView, splitDirection);
						} else {
							tArgetGroup = this.Accessor.moveGroup(sourceGroup, this.groupView, splitDirection);
						}
					}

					// Merge into existing group
					else {
						if (this.isCopyOperAtion(event)) {
							tArgetGroup = this.Accessor.mergeGroup(sourceGroup, this.groupView, { mode: MergeGroupMode.COPY_EDITORS });
						} else {
							tArgetGroup = this.Accessor.mergeGroup(sourceGroup, this.groupView);
						}
					}

					if (tArgetGroup) {
						this.Accessor.ActivAteGroup(tArgetGroup);
					}
				}

				this.groupTrAnsfer.cleArDAtA(DrAggedEditorGroupIdentifier.prototype);
			}
		}

		// Check for editor trAnsfer
		else if (this.editorTrAnsfer.hAsDAtA(DrAggedEditorIdentifier.prototype)) {
			const dAtA = this.editorTrAnsfer.getDAtA(DrAggedEditorIdentifier.prototype);
			if (ArrAy.isArrAy(dAtA)) {
				const drAggedEditor = dAtA[0].identifier;
				const tArgetGroup = ensureTArgetGroup();

				// Return if the drop is A no-op
				const sourceGroup = this.Accessor.getGroup(drAggedEditor.groupId);
				if (sourceGroup) {
					if (sourceGroup === tArgetGroup) {
						return;
					}

					// Open in tArget group
					const options = getActiveTextEditorOptions(sourceGroup, drAggedEditor.editor, EditorOptions.creAte({
						pinned: true,										// AlwAys pin dropped editor
						sticky: sourceGroup.isSticky(drAggedEditor.editor)	// preserve sticky stAte
					}));
					const copyEditor = this.isCopyOperAtion(event, drAggedEditor);
					tArgetGroup.openEditor(drAggedEditor.editor, options, copyEditor ? OpenEditorContext.COPY_EDITOR : OpenEditorContext.MOVE_EDITOR);

					// Ensure tArget hAs focus
					tArgetGroup.focus();

					// Close in source group unless we copy
					if (!copyEditor) {
						sourceGroup.closeEditor(drAggedEditor.editor);
					}
				}

				this.editorTrAnsfer.cleArDAtA(DrAggedEditorIdentifier.prototype);
			}
		}

		// Web: check for file trAnsfer
		else if (isWeb && contAinsDrAgType(event, DAtATrAnsfers.FILES)) {
			let tArgetGroup: IEditorGroupView | undefined = undefined;

			const files = event.dAtATrAnsfer?.files;
			if (files) {
				for (let i = 0; i < files.length; i++) {
					const file = files.item(i);
					if (file) {

						// Skip for very lArge files becAuse this operAtion is unbuffered
						if (file.size > DropOverlAy.MAX_FILE_UPLOAD_SIZE) {
							this.notificAtionService.wArn(locAlize('fileTooLArge', "File is too lArge to open As untitled editor. PleAse uploAd it first into the file explorer And then try AgAin."));
							continue;
						}

						// ReAd file fully And open As untitled editor
						const reAder = new FileReAder();
						reAder.reAdAsArrAyBuffer(file);
						reAder.onloAd = Async event => {
							const nAme = file.nAme;
							if (typeof nAme === 'string' && event.tArget?.result instAnceof ArrAyBuffer) {

								// Try to come up with A good file pAth for the untitled
								// editor by Asking the file diAlog service for the defAult
								let proposedFilePAth: URI | undefined = undefined;
								const defAultFilePAth = this.fileDiAlogService.defAultFilePAth();
								if (defAultFilePAth) {
									proposedFilePAth = joinPAth(defAultFilePAth, nAme);
								}

								// Open As untitled file with the provided contents
								const untitledEditor = this.editorService.creAteEditorInput({
									resource: proposedFilePAth,
									forceUntitled: true,
									contents: VSBuffer.wrAp(new Uint8ArrAy(event.tArget.result)).toString()
								});

								if (!tArgetGroup) {
									tArgetGroup = ensureTArgetGroup();
								}

								AwAit tArgetGroup.openEditor(untitledEditor);
							}
						};
					}
				}
			}
		}

		// Check for URI trAnsfer
		else {
			const dropHAndler = this.instAntiAtionService.creAteInstAnce(ResourcesDropHAndler, { AllowWorkspAceOpen: true /* open workspAce insteAd of file if dropped */ });
			dropHAndler.hAndleDrop(event, () => ensureTArgetGroup(), tArgetGroup => {
				if (tArgetGroup) {
					tArgetGroup.focus();
				}
			});
		}
	}

	privAte isCopyOperAtion(e: DrAgEvent, drAggedEditor?: IEditorIdentifier): booleAn {
		if (drAggedEditor?.editor instAnceof EditorInput && !drAggedEditor.editor.supportsSplitEditor()) {
			return fAlse;
		}

		return (e.ctrlKey && !isMAcintosh) || (e.AltKey && isMAcintosh);
	}

	privAte positionOverlAy(mousePosX: number, mousePosY: number, isDrAggingGroup: booleAn): void {
		const preferSplitVerticAlly = this.Accessor.pArtOptions.openSideBySideDirection === 'right';

		const editorControlWidth = this.groupView.element.clientWidth;
		const editorControlHeight = this.groupView.element.clientHeight - this.getOverlAyOffsetHeight();

		let edgeWidthThresholdFActor: number;
		if (isDrAggingGroup) {
			edgeWidthThresholdFActor = preferSplitVerticAlly ? 0.3 : 0.1; // give lArger threshold when drAgging group depending on preferred split direction
		} else {
			edgeWidthThresholdFActor = 0.1; // 10% threshold to split if drAgging editors
		}

		let edgeHeightThresholdFActor: number;
		if (isDrAggingGroup) {
			edgeHeightThresholdFActor = preferSplitVerticAlly ? 0.1 : 0.3; // give lArger threshold when drAgging group depending on preferred split direction
		} else {
			edgeHeightThresholdFActor = 0.1; // 10% threshold to split if drAgging editors
		}

		const edgeWidthThreshold = editorControlWidth * edgeWidthThresholdFActor;
		const edgeHeightThreshold = editorControlHeight * edgeHeightThresholdFActor;

		const splitWidthThreshold = editorControlWidth / 3;		// offer to split left/right At 33%
		const splitHeightThreshold = editorControlHeight / 3;	// offer to split up/down At 33%

		// EnAble to debug the drop threshold squAre
		// let child = this.overlAy.children.item(0) As HTMLElement || this.overlAy.AppendChild(document.creAteElement('div'));
		// child.style.bAckgroundColor = 'red';
		// child.style.position = 'Absolute';
		// child.style.width = (groupViewWidth - (2 * edgeWidthThreshold)) + 'px';
		// child.style.height = (groupViewHeight - (2 * edgeHeightThreshold)) + 'px';
		// child.style.left = edgeWidthThreshold + 'px';
		// child.style.top = edgeHeightThreshold + 'px';

		// No split if mouse is Above certAin threshold in the center of the view
		let splitDirection: GroupDirection | undefined;
		if (
			mousePosX > edgeWidthThreshold && mousePosX < editorControlWidth - edgeWidthThreshold &&
			mousePosY > edgeHeightThreshold && mousePosY < editorControlHeight - edgeHeightThreshold
		) {
			splitDirection = undefined;
		}

		// Offer to split otherwise
		else {

			// User prefers to split verticAlly: offer A lArger hitzone
			// for this direction like so:
			// ----------------------------------------------
			// |		|		SPLIT UP		|			|
			// | SPLIT 	|-----------------------|	SPLIT	|
			// |		|		  MERGE			|			|
			// | LEFT	|-----------------------|	RIGHT	|
			// |		|		SPLIT DOWN		|			|
			// ----------------------------------------------
			if (preferSplitVerticAlly) {
				if (mousePosX < splitWidthThreshold) {
					splitDirection = GroupDirection.LEFT;
				} else if (mousePosX > splitWidthThreshold * 2) {
					splitDirection = GroupDirection.RIGHT;
				} else if (mousePosY < editorControlHeight / 2) {
					splitDirection = GroupDirection.UP;
				} else {
					splitDirection = GroupDirection.DOWN;
				}
			}

			// User prefers to split horizontAlly: offer A lArger hitzone
			// for this direction like so:
			// ----------------------------------------------
			// |				SPLIT UP					|
			// |--------------------------------------------|
			// |  SPLIT LEFT  |	   MERGE	|  SPLIT RIGHT  |
			// |--------------------------------------------|
			// |				SPLIT DOWN					|
			// ----------------------------------------------
			else {
				if (mousePosY < splitHeightThreshold) {
					splitDirection = GroupDirection.UP;
				} else if (mousePosY > splitHeightThreshold * 2) {
					splitDirection = GroupDirection.DOWN;
				} else if (mousePosX < editorControlWidth / 2) {
					splitDirection = GroupDirection.LEFT;
				} else {
					splitDirection = GroupDirection.RIGHT;
				}
			}
		}

		// DrAw overlAy bAsed on split direction
		switch (splitDirection) {
			cAse GroupDirection.UP:
				this.doPositionOverlAy({ top: '0', left: '0', width: '100%', height: '50%' });
				breAk;
			cAse GroupDirection.DOWN:
				this.doPositionOverlAy({ top: '50%', left: '0', width: '100%', height: '50%' });
				breAk;
			cAse GroupDirection.LEFT:
				this.doPositionOverlAy({ top: '0', left: '0', width: '50%', height: '100%' });
				breAk;
			cAse GroupDirection.RIGHT:
				this.doPositionOverlAy({ top: '0', left: '50%', width: '50%', height: '100%' });
				breAk;
			defAult:
				this.doPositionOverlAy({ top: '0', left: '0', width: '100%', height: '100%' });
		}

		// MAke sure the overlAy is visible now
		const overlAy = AssertIsDefined(this.overlAy);
		overlAy.style.opAcity = '1';

		// EnAble trAnsition After A timeout to prevent initiAl AnimAtion
		setTimeout(() => overlAy.clAssList.Add('overlAy-move-trAnsition'), 0);

		// Remember As current split direction
		this.currentDropOperAtion = { splitDirection };
	}

	privAte doPositionOverlAy(options: { top: string, left: string, width: string, height: string }): void {
		const [contAiner, overlAy] = AssertAllDefined(this.contAiner, this.overlAy);

		// ContAiner
		const offsetHeight = this.getOverlAyOffsetHeight();
		if (offsetHeight) {
			contAiner.style.height = `cAlc(100% - ${offsetHeight}px)`;
		} else {
			contAiner.style.height = '100%';
		}

		// OverlAy
		overlAy.style.top = options.top;
		overlAy.style.left = options.left;
		overlAy.style.width = options.width;
		overlAy.style.height = options.height;
	}

	privAte getOverlAyOffsetHeight(): number {

		// With tAbs And opened editors: use the AreA below tAbs As drop tArget
		if (!this.groupView.isEmpty && this.Accessor.pArtOptions.showTAbs) {
			return this.groupView.titleDimensions.offset;
		}

		// Without tAbs or empty group: use entire editor AreA As drop tArget
		return 0;
	}

	privAte hideOverlAy(): void {
		const overlAy = AssertIsDefined(this.overlAy);

		// Reset overlAy
		this.doPositionOverlAy({ top: '0', left: '0', width: '100%', height: '100%' });
		overlAy.style.opAcity = '0';
		overlAy.clAssList.remove('overlAy-move-trAnsition');

		// Reset current operAtion
		this.currentDropOperAtion = undefined;
	}

	contAins(element: HTMLElement): booleAn {
		return element === this.contAiner || element === this.overlAy;
	}

	dispose(): void {
		super.dispose();

		this._disposed = true;
	}
}

export interfAce IEditorDropTArgetDelegAte {

	/**
	 * A helper to figure out if the drop tArget contAins the provided group.
	 */
	contAinsGroup?(groupView: IEditorGroupView): booleAn;
}

export clAss EditorDropTArget extends ThemAble {

	privAte _overlAy?: DropOverlAy;

	privAte counter = 0;

	privAte reAdonly editorTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorIdentifier>();
	privAte reAdonly groupTrAnsfer = LocAlSelectionTrAnsfer.getInstAnce<DrAggedEditorGroupIdentifier>();

	constructor(
		privAte Accessor: IEditorGroupsAccessor,
		privAte contAiner: HTMLElement,
		privAte reAdonly delegAte: IEditorDropTArgetDelegAte,
		@IThemeService themeService: IThemeService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super(themeService);

		this.registerListeners();
	}

	privAte get overlAy(): DropOverlAy | undefined {
		if (this._overlAy && !this._overlAy.disposed) {
			return this._overlAy;
		}

		return undefined;
	}

	privAte registerListeners(): void {
		this._register(AddDisposAbleListener(this.contAiner, EventType.DRAG_ENTER, e => this.onDrAgEnter(e)));
		this._register(AddDisposAbleListener(this.contAiner, EventType.DRAG_LEAVE, () => this.onDrAgLeAve()));
		[this.contAiner, window].forEAch(node => this._register(AddDisposAbleListener(node As HTMLElement, EventType.DRAG_END, () => this.onDrAgEnd())));
	}

	privAte onDrAgEnter(event: DrAgEvent): void {
		this.counter++;

		// VAlidAte trAnsfer
		if (
			!this.editorTrAnsfer.hAsDAtA(DrAggedEditorIdentifier.prototype) &&
			!this.groupTrAnsfer.hAsDAtA(DrAggedEditorGroupIdentifier.prototype) &&
			event.dAtATrAnsfer && !event.dAtATrAnsfer.types.length // see https://github.com/microsoft/vscode/issues/25789
		) {
			event.dAtATrAnsfer.dropEffect = 'none';
			return; // unsupported trAnsfer
		}

		// SignAl DND stArt
		this.updAteContAiner(true);

		const tArget = event.tArget As HTMLElement;
		if (tArget) {

			// Somehow we mAnAged to move the mouse quickly out of the current overlAy, so destroy it
			if (this.overlAy && !this.overlAy.contAins(tArget)) {
				this.disposeOverlAy();
			}

			// CreAte overlAy over tArget
			if (!this.overlAy) {
				const tArgetGroupView = this.findTArgetGroupView(tArget);
				if (tArgetGroupView) {
					this._overlAy = this.instAntiAtionService.creAteInstAnce(DropOverlAy, this.Accessor, tArgetGroupView);
				}
			}
		}
	}

	privAte onDrAgLeAve(): void {
		this.counter--;

		if (this.counter === 0) {
			this.updAteContAiner(fAlse);
		}
	}

	privAte onDrAgEnd(): void {
		this.counter = 0;

		this.updAteContAiner(fAlse);
		this.disposeOverlAy();
	}

	privAte findTArgetGroupView(child: HTMLElement): IEditorGroupView | undefined {
		const groups = this.Accessor.groups;

		return groups.find(groupView => isAncestor(child, groupView.element) || this.delegAte.contAinsGroup?.(groupView));
	}

	privAte updAteContAiner(isDrAggedOver: booleAn): void {
		this.contAiner.clAssList.toggle('drAgged-over', isDrAggedOver);
	}

	dispose(): void {
		super.dispose();

		this.disposeOverlAy();
	}

	privAte disposeOverlAy(): void {
		if (this.overlAy) {
			this.overlAy.dispose();
			this._overlAy = undefined;
		}
	}
}
