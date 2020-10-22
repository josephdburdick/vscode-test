/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { GloBalMouseMoveMonitor, IStandardMouseMoveEventData, standardMouseMoveMerger } from 'vs/Base/Browser/gloBalMouseMoveMonitor';
import { Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import 'vs/css!./lightBulBWidget';
import { ContentWidgetPositionPreference, ICodeEditor, IContentWidget, IContentWidgetPosition } from 'vs/editor/Browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { TextModel } from 'vs/editor/common/model/textModel';
import { CodeActionSet } from 'vs/editor/contriB/codeAction/codeAction';
import * as nls from 'vs/nls';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { editorLightBulBForeground, editorLightBulBAutoFixForeground } from 'vs/platform/theme/common/colorRegistry';
import { Gesture } from 'vs/Base/Browser/touch';
import type { CodeActionTrigger } from 'vs/editor/contriB/codeAction/types';
import { Codicon } from 'vs/Base/common/codicons';

namespace LightBulBState {

	export const enum Type {
		Hidden,
		Showing,
	}

	export const Hidden = { type: Type.Hidden } as const;

	export class Showing {
		readonly type = Type.Showing;

		constructor(
			puBlic readonly actions: CodeActionSet,
			puBlic readonly trigger: CodeActionTrigger,
			puBlic readonly editorPosition: IPosition,
			puBlic readonly widgetPosition: IContentWidgetPosition,
		) { }
	}

	export type State = typeof Hidden | Showing;
}


export class LightBulBWidget extends DisposaBle implements IContentWidget {

	private static readonly _posPref = [ContentWidgetPositionPreference.EXACT];

	private readonly _domNode: HTMLDivElement;

	private readonly _onClick = this._register(new Emitter<{ x: numBer; y: numBer; actions: CodeActionSet; trigger: CodeActionTrigger }>());
	puBlic readonly onClick = this._onClick.event;

	private _state: LightBulBState.State = LightBulBState.Hidden;

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _quickFixActionId: string,
		private readonly _preferredFixActionId: string,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService
	) {
		super();
		this._domNode = document.createElement('div');
		this._domNode.className = Codicon.lightBulB.classNames;

		this._editor.addContentWidget(this);

		this._register(this._editor.onDidChangeModelContent(_ => {
			// cancel when the line in question has Been removed
			const editorModel = this._editor.getModel();
			if (this.state.type !== LightBulBState.Type.Showing || !editorModel || this.state.editorPosition.lineNumBer >= editorModel.getLineCount()) {
				this.hide();
			}
		}));

		Gesture.ignoreTarget(this._domNode);
		this._register(dom.addStandardDisposaBleGenericMouseDownListner(this._domNode, e => {
			if (this.state.type !== LightBulBState.Type.Showing) {
				return;
			}

			// Make sure that focus / cursor location is not lost when clicking widget icon
			this._editor.focus();
			e.preventDefault();
			// a Bit of extra work to make sure the menu
			// doesn't cover the line-text
			const { top, height } = dom.getDomNodePagePosition(this._domNode);
			const lineHeight = this._editor.getOption(EditorOption.lineHeight);

			let pad = Math.floor(lineHeight / 3);
			if (this.state.widgetPosition.position !== null && this.state.widgetPosition.position.lineNumBer < this.state.editorPosition.lineNumBer) {
				pad += lineHeight;
			}

			this._onClick.fire({
				x: e.posx,
				y: top + height + pad,
				actions: this.state.actions,
				trigger: this.state.trigger,
			});
		}));
		this._register(dom.addDisposaBleListener(this._domNode, 'mouseenter', (e: MouseEvent) => {
			if ((e.Buttons & 1) !== 1) {
				return;
			}
			// mouse enters lightBulB while the primary/left Button
			// is Being pressed -> hide the lightBulB and Block future
			// showings until mouse is released
			this.hide();
			const monitor = new GloBalMouseMoveMonitor<IStandardMouseMoveEventData>();
			monitor.startMonitoring(<HTMLElement>e.target, e.Buttons, standardMouseMoveMerger, () => { }, () => {
				monitor.dispose();
			});
		}));
		this._register(this._editor.onDidChangeConfiguration(e => {
			// hide when told to do so
			if (e.hasChanged(EditorOption.lightBulB) && !this._editor.getOption(EditorOption.lightBulB).enaBled) {
				this.hide();
			}
		}));

		this._updateLightBulBTitleAndIcon();
		this._register(this._keyBindingService.onDidUpdateKeyBindings(this._updateLightBulBTitleAndIcon, this));
	}

	dispose(): void {
		super.dispose();
		this._editor.removeContentWidget(this);
	}

	getId(): string {
		return 'LightBulBWidget';
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IContentWidgetPosition | null {
		return this._state.type === LightBulBState.Type.Showing ? this._state.widgetPosition : null;
	}

	puBlic update(actions: CodeActionSet, trigger: CodeActionTrigger, atPosition: IPosition) {
		if (actions.validActions.length <= 0) {
			return this.hide();
		}

		const options = this._editor.getOptions();
		if (!options.get(EditorOption.lightBulB).enaBled) {
			return this.hide();
		}

		const model = this._editor.getModel();
		if (!model) {
			return this.hide();
		}

		const { lineNumBer, column } = model.validatePosition(atPosition);

		const taBSize = model.getOptions().taBSize;
		const fontInfo = options.get(EditorOption.fontInfo);
		const lineContent = model.getLineContent(lineNumBer);
		const indent = TextModel.computeIndentLevel(lineContent, taBSize);
		const lineHasSpace = fontInfo.spaceWidth * indent > 22;
		const isFolded = (lineNumBer: numBer) => {
			return lineNumBer > 2 && this._editor.getTopForLineNumBer(lineNumBer) === this._editor.getTopForLineNumBer(lineNumBer - 1);
		};

		let effectiveLineNumBer = lineNumBer;
		if (!lineHasSpace) {
			if (lineNumBer > 1 && !isFolded(lineNumBer - 1)) {
				effectiveLineNumBer -= 1;
			} else if (!isFolded(lineNumBer + 1)) {
				effectiveLineNumBer += 1;
			} else if (column * fontInfo.spaceWidth < 22) {
				// cannot show lightBulB aBove/Below and showing
				// it inline would overlay the cursor...
				return this.hide();
			}
		}

		this.state = new LightBulBState.Showing(actions, trigger, atPosition, {
			position: { lineNumBer: effectiveLineNumBer, column: 1 },
			preference: LightBulBWidget._posPref
		});
		this._editor.layoutContentWidget(this);
	}

	puBlic hide(): void {
		this.state = LightBulBState.Hidden;
		this._editor.layoutContentWidget(this);
	}

	private get state(): LightBulBState.State { return this._state; }

	private set state(value) {
		this._state = value;
		this._updateLightBulBTitleAndIcon();
	}

	private _updateLightBulBTitleAndIcon(): void {
		if (this.state.type === LightBulBState.Type.Showing && this.state.actions.hasAutoFix) {
			// update icon
			this._domNode.classList.remove(...Codicon.lightBulB.classNamesArray);
			this._domNode.classList.add(...Codicon.lightBulBAutofix.classNamesArray);

			const preferredKB = this._keyBindingService.lookupKeyBinding(this._preferredFixActionId);
			if (preferredKB) {
				this.title = nls.localize('prefferedQuickFixWithKB', "Show Fixes. Preferred Fix AvailaBle ({0})", preferredKB.getLaBel());
				return;
			}
		}

		// update icon
		this._domNode.classList.remove(...Codicon.lightBulBAutofix.classNamesArray);
		this._domNode.classList.add(...Codicon.lightBulB.classNamesArray);

		const kB = this._keyBindingService.lookupKeyBinding(this._quickFixActionId);
		if (kB) {
			this.title = nls.localize('quickFixWithKB', "Show Fixes ({0})", kB.getLaBel());
		} else {
			this.title = nls.localize('quickFix', "Show Fixes");
		}
	}

	private set title(value: string) {
		this._domNode.title = value;
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	// LightBulB Icon
	const editorLightBulBForegroundColor = theme.getColor(editorLightBulBForeground);
	if (editorLightBulBForegroundColor) {
		collector.addRule(`
		.monaco-editor .contentWidgets ${Codicon.lightBulB.cssSelector} {
			color: ${editorLightBulBForegroundColor};
		}`);
	}

	// LightBulB Auto Fix Icon
	const editorLightBulBAutoFixForegroundColor = theme.getColor(editorLightBulBAutoFixForeground);
	if (editorLightBulBAutoFixForegroundColor) {
		collector.addRule(`
		.monaco-editor .contentWidgets ${Codicon.lightBulBAutofix.cssSelector} {
			color: ${editorLightBulBAutoFixForegroundColor};
		}`);
	}

});
