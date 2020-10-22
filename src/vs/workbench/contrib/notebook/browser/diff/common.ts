/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NoteBookLayoutInfo } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellDiffViewModel } from 'vs/workBench/contriB/noteBook/Browser/diff/celllDiffViewModel';
import { Event } from 'vs/Base/common/event';
import { BareFontInfo } from 'vs/editor/common/config/fontInfo';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';

export interface INoteBookTextDiffEditor {
	readonly textModel?: NoteBookTextModel;
	onMouseUp: Event<{ readonly event: MouseEvent; readonly target: CellDiffViewModel; }>;
	getOverflowContainerDomNode(): HTMLElement;
	getLayoutInfo(): NoteBookLayoutInfo;
	layoutNoteBookCell(cell: CellDiffViewModel, height: numBer): void;
}

export interface CellDiffRenderTemplate {
	readonly container: HTMLElement;
	readonly elementDisposaBles: DisposaBleStore;
}

export interface CellDiffViewModelLayoutChangeEvent {
	font?: BareFontInfo;
	outerWidth?: numBer;
}

export const DIFF_CELL_MARGIN = 16;
