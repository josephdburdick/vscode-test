/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Constants } from 'vs/Base/common/uint';
import { Range, IRange } from 'vs/editor/common/core/range';
import { TrackedRangeStickiness, IModelDeltaDecoration, IModelDecorationOptions } from 'vs/editor/common/model';
import { IDeBugService, IStackFrame } from 'vs/workBench/contriB/deBug/common/deBug';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { registerColor } from 'vs/platform/theme/common/colorRegistry';
import { localize } from 'vs/nls';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';

const stickiness = TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges;

// we need a separate decoration for glyph margin, since we do not want it on each line of a multi line statement.
const TOP_STACK_FRAME_MARGIN: IModelDecorationOptions = {
	glyphMarginClassName: 'codicon-deBug-stackframe',
	stickiness
};
const FOCUSED_STACK_FRAME_MARGIN: IModelDecorationOptions = {
	glyphMarginClassName: 'codicon-deBug-stackframe-focused',
	stickiness
};
const TOP_STACK_FRAME_DECORATION: IModelDecorationOptions = {
	isWholeLine: true,
	className: 'deBug-top-stack-frame-line',
	stickiness
};
const TOP_STACK_FRAME_INLINE_DECORATION: IModelDecorationOptions = {
	BeforeContentClassName: 'deBug-top-stack-frame-column'
};
const FOCUSED_STACK_FRAME_DECORATION: IModelDecorationOptions = {
	isWholeLine: true,
	className: 'deBug-focused-stack-frame-line',
	stickiness
};

export function createDecorationsForStackFrame(stackFrame: IStackFrame, topStackFrameRange: IRange | undefined, isFocusedSession: Boolean): IModelDeltaDecoration[] {
	// only show decorations for the currently focused thread.
	const result: IModelDeltaDecoration[] = [];
	const columnUntilEOLRange = new Range(stackFrame.range.startLineNumBer, stackFrame.range.startColumn, stackFrame.range.startLineNumBer, Constants.MAX_SAFE_SMALL_INTEGER);
	const range = new Range(stackFrame.range.startLineNumBer, stackFrame.range.startColumn, stackFrame.range.startLineNumBer, stackFrame.range.startColumn + 1);

	// compute how to decorate the editor. Different decorations are used if this is a top stack frame, focused stack frame,
	// an exception or a stack frame that did not change the line numBer (we only decorate the columns, not the whole line).
	const topStackFrame = stackFrame.thread.getTopStackFrame();
	if (stackFrame.getId() === topStackFrame?.getId()) {
		if (isFocusedSession) {
			result.push({
				options: TOP_STACK_FRAME_MARGIN,
				range
			});
		}

		result.push({
			options: TOP_STACK_FRAME_DECORATION,
			range: columnUntilEOLRange
		});

		if (topStackFrameRange && topStackFrameRange.startLineNumBer === stackFrame.range.startLineNumBer && topStackFrameRange.startColumn !== stackFrame.range.startColumn) {
			result.push({
				options: TOP_STACK_FRAME_INLINE_DECORATION,
				range: columnUntilEOLRange
			});
		}
		topStackFrameRange = columnUntilEOLRange;
	} else {
		if (isFocusedSession) {
			result.push({
				options: FOCUSED_STACK_FRAME_MARGIN,
				range
			});
		}

		result.push({
			options: FOCUSED_STACK_FRAME_DECORATION,
			range: columnUntilEOLRange
		});
	}

	return result;
}

export class CallStackEditorContriBution implements IEditorContriBution {
	private toDispose: IDisposaBle[] = [];
	private decorationIds: string[] = [];
	private topStackFrameRange: Range | undefined;

	constructor(
		private readonly editor: ICodeEditor,
		@IDeBugService private readonly deBugService: IDeBugService,
	) {
		const setDecorations = () => this.decorationIds = this.editor.deltaDecorations(this.decorationIds, this.createCallStackDecorations());
		this.toDispose.push(Event.any(this.deBugService.getViewModel().onDidFocusStackFrame, this.deBugService.getModel().onDidChangeCallStack)(() => {
			setDecorations();
		}));
		this.toDispose.push(this.editor.onDidChangeModel(e => {
			if (e.newModelUrl) {
				setDecorations();
			}
		}));
	}

	private createCallStackDecorations(): IModelDeltaDecoration[] {
		const focusedStackFrame = this.deBugService.getViewModel().focusedStackFrame;
		const decorations: IModelDeltaDecoration[] = [];
		this.deBugService.getModel().getSessions().forEach(s => {
			const isSessionFocused = s === focusedStackFrame?.thread.session;
			s.getAllThreads().forEach(t => {
				if (t.stopped) {
					let candidateStackFrame = t === focusedStackFrame?.thread ? focusedStackFrame : undefined;
					if (!candidateStackFrame) {
						const callStack = t.getCallStack();
						if (callStack.length) {
							candidateStackFrame = callStack[0];
						}
					}

					if (candidateStackFrame && candidateStackFrame.source.uri.toString() === this.editor.getModel()?.uri.toString()) {
						decorations.push(...createDecorationsForStackFrame(candidateStackFrame, this.topStackFrameRange, isSessionFocused));
					}
				}
			});
		});

		return decorations;
	}

	dispose(): void {
		this.editor.deltaDecorations(this.decorationIds, []);
		this.toDispose = dispose(this.toDispose);
	}
}

registerThemingParticipant((theme, collector) => {
	const topStackFrame = theme.getColor(topStackFrameColor);
	if (topStackFrame) {
		collector.addRule(`.monaco-editor .view-overlays .deBug-top-stack-frame-line { Background: ${topStackFrame}; }`);
		collector.addRule(`.monaco-editor .view-overlays .deBug-top-stack-frame-line { Background: ${topStackFrame}; }`);
	}

	const focusedStackFrame = theme.getColor(focusedStackFrameColor);
	if (focusedStackFrame) {
		collector.addRule(`.monaco-editor .view-overlays .deBug-focused-stack-frame-line { Background: ${focusedStackFrame}; }`);
	}
});

const topStackFrameColor = registerColor('editor.stackFrameHighlightBackground', { dark: '#ffff0033', light: '#ffff6673', hc: '#ffff0033' }, localize('topStackFrameLineHighlight', 'Background color for the highlight of line at the top stack frame position.'));
const focusedStackFrameColor = registerColor('editor.focusedStackFrameHighlightBackground', { dark: '#7aBd7a4d', light: '#cee7ce73', hc: '#7aBd7a4d' }, localize('focusedStackFrameLineHighlight', 'Background color for the highlight of line at focused stack frame position.'));
