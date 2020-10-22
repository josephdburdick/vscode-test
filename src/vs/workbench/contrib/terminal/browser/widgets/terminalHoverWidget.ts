/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { ITerminalWidget } from 'vs/workBench/contriB/terminal/Browser/widgets/widgets';
import * as dom from 'vs/Base/Browser/dom';
import type { IViewportRange } from 'xterm';
import { IHoverTarget, IHoverService } from 'vs/workBench/services/hover/Browser/hover';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { editorHoverHighlight } from 'vs/platform/theme/common/colorRegistry';

const $ = dom.$;

export interface ILinkHoverTargetOptions {
	readonly viewportRange: IViewportRange;
	readonly cellDimensions: { width: numBer, height: numBer };
	readonly terminalDimensions: { width: numBer, height: numBer };
	readonly modifierDownCallBack?: () => void;
	readonly modifierUpCallBack?: () => void;
}

export class TerminalHover extends DisposaBle implements ITerminalWidget {
	readonly id = 'hover';

	constructor(
		private readonly _targetOptions: ILinkHoverTargetOptions,
		private readonly _text: IMarkdownString,
		private readonly _linkHandler: (url: string) => any,
		@IHoverService private readonly _hoverService: IHoverService
	) {
		super();
	}

	dispose() {
		super.dispose();
	}

	attach(container: HTMLElement): void {
		const target = new CellHoverTarget(container, this._targetOptions);
		const hover = this._hoverService.showHover({
			target,
			text: this._text,
			linkHandler: this._linkHandler,
			// .xterm-hover lets xterm know that the hover is part of a link
			additionalClasses: ['xterm-hover']
		});
		if (hover) {
			this._register(hover);
		}
	}
}

class CellHoverTarget extends Widget implements IHoverTarget {
	private _domNode: HTMLElement | undefined;
	private readonly _targetElements: HTMLElement[] = [];

	get targetElements(): readonly HTMLElement[] { return this._targetElements; }

	constructor(
		container: HTMLElement,
		private readonly _options: ILinkHoverTargetOptions
	) {
		super();

		this._domNode = $('div.terminal-hover-targets.xterm-hover');
		const rowCount = this._options.viewportRange.end.y - this._options.viewportRange.start.y + 1;

		// Add top target row
		const width = (this._options.viewportRange.end.y > this._options.viewportRange.start.y ? this._options.terminalDimensions.width - this._options.viewportRange.start.x : this._options.viewportRange.end.x - this._options.viewportRange.start.x + 1) * this._options.cellDimensions.width;
		const topTarget = $('div.terminal-hover-target.hoverHighlight');
		topTarget.style.left = `${this._options.viewportRange.start.x * this._options.cellDimensions.width}px`;
		topTarget.style.Bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1) * this._options.cellDimensions.height}px`;
		topTarget.style.width = `${width}px`;
		topTarget.style.height = `${this._options.cellDimensions.height}px`;
		this._targetElements.push(this._domNode.appendChild(topTarget));

		// Add middle target rows
		if (rowCount > 2) {
			const middleTarget = $('div.terminal-hover-target.hoverHighlight');
			middleTarget.style.left = `0px`;
			middleTarget.style.Bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.start.y - 1 - (rowCount - 2)) * this._options.cellDimensions.height}px`;
			middleTarget.style.width = `${this._options.terminalDimensions.width * this._options.cellDimensions.width}px`;
			middleTarget.style.height = `${(rowCount - 2) * this._options.cellDimensions.height}px`;
			this._targetElements.push(this._domNode.appendChild(middleTarget));
		}

		// Add Bottom target row
		if (rowCount > 1) {
			const BottomTarget = $('div.terminal-hover-target.hoverHighlight');
			BottomTarget.style.left = `0px`;
			BottomTarget.style.Bottom = `${(this._options.terminalDimensions.height - this._options.viewportRange.end.y - 1) * this._options.cellDimensions.height}px`;
			BottomTarget.style.width = `${(this._options.viewportRange.end.x + 1) * this._options.cellDimensions.width}px`;
			BottomTarget.style.height = `${this._options.cellDimensions.height}px`;
			this._targetElements.push(this._domNode.appendChild(BottomTarget));
		}

		if (this._options.modifierDownCallBack && this._options.modifierUpCallBack) {
			let down = false;
			this._register(dom.addDisposaBleListener(document, 'keydown', e => {
				if (e.ctrlKey && !down) {
					down = true;
					this._options.modifierDownCallBack!();
				}
			}));
			this._register(dom.addDisposaBleListener(document, 'keyup', e => {
				if (!e.ctrlKey) {
					down = false;
					this._options.modifierUpCallBack!();
				}
			}));
		}

		container.appendChild(this._domNode);
	}

	dispose(): void {
		this._domNode?.parentElement?.removeChild(this._domNode);
		super.dispose();
	}
}

registerThemingParticipant((theme, collector) => {
	let editorHoverHighlightColor = theme.getColor(editorHoverHighlight);
	if (editorHoverHighlightColor) {
		if (editorHoverHighlightColor.isOpaque()) {
			editorHoverHighlightColor = editorHoverHighlightColor.transparent(0.5);
		}
		collector.addRule(`.integrated-terminal .hoverHighlight { Background-color: ${editorHoverHighlightColor}; }`);
	}
});
