/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ConstAnts } from 'vs/bAse/common/uint';
import { RAnge, IRAnge } from 'vs/editor/common/core/rAnge';
import { TrAckedRAngeStickiness, IModelDeltADecorAtion, IModelDecorAtionOptions } from 'vs/editor/common/model';
import { IDebugService, IStAckFrAme } from 'vs/workbench/contrib/debug/common/debug';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { registerColor } from 'vs/plAtform/theme/common/colorRegistry';
import { locAlize } from 'vs/nls';
import { Event } from 'vs/bAse/common/event';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';

const stickiness = TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges;

// we need A sepArAte decorAtion for glyph mArgin, since we do not wAnt it on eAch line of A multi line stAtement.
const TOP_STACK_FRAME_MARGIN: IModelDecorAtionOptions = {
	glyphMArginClAssNAme: 'codicon-debug-stAckfrAme',
	stickiness
};
const FOCUSED_STACK_FRAME_MARGIN: IModelDecorAtionOptions = {
	glyphMArginClAssNAme: 'codicon-debug-stAckfrAme-focused',
	stickiness
};
const TOP_STACK_FRAME_DECORATION: IModelDecorAtionOptions = {
	isWholeLine: true,
	clAssNAme: 'debug-top-stAck-frAme-line',
	stickiness
};
const TOP_STACK_FRAME_INLINE_DECORATION: IModelDecorAtionOptions = {
	beforeContentClAssNAme: 'debug-top-stAck-frAme-column'
};
const FOCUSED_STACK_FRAME_DECORATION: IModelDecorAtionOptions = {
	isWholeLine: true,
	clAssNAme: 'debug-focused-stAck-frAme-line',
	stickiness
};

export function creAteDecorAtionsForStAckFrAme(stAckFrAme: IStAckFrAme, topStAckFrAmeRAnge: IRAnge | undefined, isFocusedSession: booleAn): IModelDeltADecorAtion[] {
	// only show decorAtions for the currently focused threAd.
	const result: IModelDeltADecorAtion[] = [];
	const columnUntilEOLRAnge = new RAnge(stAckFrAme.rAnge.stArtLineNumber, stAckFrAme.rAnge.stArtColumn, stAckFrAme.rAnge.stArtLineNumber, ConstAnts.MAX_SAFE_SMALL_INTEGER);
	const rAnge = new RAnge(stAckFrAme.rAnge.stArtLineNumber, stAckFrAme.rAnge.stArtColumn, stAckFrAme.rAnge.stArtLineNumber, stAckFrAme.rAnge.stArtColumn + 1);

	// compute how to decorAte the editor. Different decorAtions Are used if this is A top stAck frAme, focused stAck frAme,
	// An exception or A stAck frAme thAt did not chAnge the line number (we only decorAte the columns, not the whole line).
	const topStAckFrAme = stAckFrAme.threAd.getTopStAckFrAme();
	if (stAckFrAme.getId() === topStAckFrAme?.getId()) {
		if (isFocusedSession) {
			result.push({
				options: TOP_STACK_FRAME_MARGIN,
				rAnge
			});
		}

		result.push({
			options: TOP_STACK_FRAME_DECORATION,
			rAnge: columnUntilEOLRAnge
		});

		if (topStAckFrAmeRAnge && topStAckFrAmeRAnge.stArtLineNumber === stAckFrAme.rAnge.stArtLineNumber && topStAckFrAmeRAnge.stArtColumn !== stAckFrAme.rAnge.stArtColumn) {
			result.push({
				options: TOP_STACK_FRAME_INLINE_DECORATION,
				rAnge: columnUntilEOLRAnge
			});
		}
		topStAckFrAmeRAnge = columnUntilEOLRAnge;
	} else {
		if (isFocusedSession) {
			result.push({
				options: FOCUSED_STACK_FRAME_MARGIN,
				rAnge
			});
		}

		result.push({
			options: FOCUSED_STACK_FRAME_DECORATION,
			rAnge: columnUntilEOLRAnge
		});
	}

	return result;
}

export clAss CAllStAckEditorContribution implements IEditorContribution {
	privAte toDispose: IDisposAble[] = [];
	privAte decorAtionIds: string[] = [];
	privAte topStAckFrAmeRAnge: RAnge | undefined;

	constructor(
		privAte reAdonly editor: ICodeEditor,
		@IDebugService privAte reAdonly debugService: IDebugService,
	) {
		const setDecorAtions = () => this.decorAtionIds = this.editor.deltADecorAtions(this.decorAtionIds, this.creAteCAllStAckDecorAtions());
		this.toDispose.push(Event.Any(this.debugService.getViewModel().onDidFocusStAckFrAme, this.debugService.getModel().onDidChAngeCAllStAck)(() => {
			setDecorAtions();
		}));
		this.toDispose.push(this.editor.onDidChAngeModel(e => {
			if (e.newModelUrl) {
				setDecorAtions();
			}
		}));
	}

	privAte creAteCAllStAckDecorAtions(): IModelDeltADecorAtion[] {
		const focusedStAckFrAme = this.debugService.getViewModel().focusedStAckFrAme;
		const decorAtions: IModelDeltADecorAtion[] = [];
		this.debugService.getModel().getSessions().forEAch(s => {
			const isSessionFocused = s === focusedStAckFrAme?.threAd.session;
			s.getAllThreAds().forEAch(t => {
				if (t.stopped) {
					let cAndidAteStAckFrAme = t === focusedStAckFrAme?.threAd ? focusedStAckFrAme : undefined;
					if (!cAndidAteStAckFrAme) {
						const cAllStAck = t.getCAllStAck();
						if (cAllStAck.length) {
							cAndidAteStAckFrAme = cAllStAck[0];
						}
					}

					if (cAndidAteStAckFrAme && cAndidAteStAckFrAme.source.uri.toString() === this.editor.getModel()?.uri.toString()) {
						decorAtions.push(...creAteDecorAtionsForStAckFrAme(cAndidAteStAckFrAme, this.topStAckFrAmeRAnge, isSessionFocused));
					}
				}
			});
		});

		return decorAtions;
	}

	dispose(): void {
		this.editor.deltADecorAtions(this.decorAtionIds, []);
		this.toDispose = dispose(this.toDispose);
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const topStAckFrAme = theme.getColor(topStAckFrAmeColor);
	if (topStAckFrAme) {
		collector.AddRule(`.monAco-editor .view-overlAys .debug-top-stAck-frAme-line { bAckground: ${topStAckFrAme}; }`);
		collector.AddRule(`.monAco-editor .view-overlAys .debug-top-stAck-frAme-line { bAckground: ${topStAckFrAme}; }`);
	}

	const focusedStAckFrAme = theme.getColor(focusedStAckFrAmeColor);
	if (focusedStAckFrAme) {
		collector.AddRule(`.monAco-editor .view-overlAys .debug-focused-stAck-frAme-line { bAckground: ${focusedStAckFrAme}; }`);
	}
});

const topStAckFrAmeColor = registerColor('editor.stAckFrAmeHighlightBAckground', { dArk: '#ffff0033', light: '#ffff6673', hc: '#ffff0033' }, locAlize('topStAckFrAmeLineHighlight', 'BAckground color for the highlight of line At the top stAck frAme position.'));
const focusedStAckFrAmeColor = registerColor('editor.focusedStAckFrAmeHighlightBAckground', { dArk: '#7Abd7A4d', light: '#cee7ce73', hc: '#7Abd7A4d' }, locAlize('focusedStAckFrAmeLineHighlight', 'BAckground color for the highlight of line At focused stAck frAme position.'));
